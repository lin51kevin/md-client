/**
 * Shared HTML → Markdown conversion utilities.
 *
 * Used by both the main-thread path (html-import.ts) and the
 * Web Worker path (html-import.worker.ts). Vite bundles this
 * into the Worker automatically.
 */

import TurndownService from 'turndown';

// ── Turndown configuration ─────────────────────────────────────────────────

export function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  // GFM strikethrough: <del> / <s> → ~~text~~
  td.addRule('strikethrough', {
    filter: ['del', 's'],
    replacement: (content) => `~~${content}~~`,
  });

  // AsciiDoc admonition blocks: <div class="admonitionblock note|tip|warning|important|caution">
  // Must be registered before the 'table' rule so it captures the wrapping div
  // and prevents the inner admonition table from leaking into the output.
  td.addRule('admonitionBlock', {
    filter: (node) => {
      const el = node as unknown as Element;
      if (el.nodeName !== 'DIV') return false;
      return /\badmonitionblock\b/.test(el.getAttribute?.('class') ?? '');
    },
    replacement: (_content, node) => {
      const el = node as unknown as Element;
      const cls = el.getAttribute?.('class') ?? '';
      const typeMatch = cls.match(/\badmonitionblock\s+(\w+)/);
      const admonType = typeMatch ? typeMatch[1].toUpperCase() : 'NOTE';
      const contentCell = el.querySelector?.('td.content');
      if (!contentCell) {
        return _content.trim() ? `\n\n${_content.trim()}\n\n` : '';
      }
      const bodyMd = td.turndown(
        contentCell.innerHTML ?? contentCell.textContent ?? '',
      );
      const lines = bodyMd.trim().split('\n');
      const blockquote = [
        `> **${admonType}:** ${lines[0] ?? ''}`,
        ...lines.slice(1).map((l) => `> ${l}`),
      ].join('\n');
      return `\n\n${blockquote}\n\n`;
    },
  });

  // GFM tables — recursively convert cell content (not just textContent)
  td.addRule('table', {
    filter: 'table',
    replacement: (_content, node) => {
      const el = node as unknown as Element;
      const rows = getTableRows(el);
      if (rows.length === 0) return '';

      const cellMarkdown = (cell: Element) => {
        // Use turndown to convert cell content so inline formatting is preserved
        const inner = td.turndown(cell.innerHTML ?? cell.textContent ?? '');
        return inner.trim().replace(/\|/g, '\\|').replace(/\n/g, ' ');
      };

      const headerRow = rows[0];
      const headers = getRowCells(headerRow).map(cellMarkdown);
      const separator = headers.map(() => '---');

      const bodyRows = rows.slice(1).map(row =>
        getRowCells(row).map(cellMarkdown),
      );

      const lines = [
        `| ${headers.join(' | ')} |`,
        `| ${separator.join(' | ')} |`,
        ...bodyRows.map(row => `| ${row.join(' | ')} |`),
      ];
      return `\n\n${lines.join('\n')}\n\n`;
    },
  });

  // Fenced code blocks with language detection: <pre><code class="language-xxx">
  td.addRule('fencedCodeBlockWithLang', {
    filter: (node) => {
      const el = node as unknown as Element;
      return (
        el.nodeName === 'PRE' &&
        el.firstElementChild?.nodeName === 'CODE' &&
        /language-/.test(el.firstElementChild?.getAttribute?.('class') ?? '')
      );
    },
    replacement: (_content, node) => {
      const el = node as unknown as Element;
      const codeEl = el.firstElementChild!;
      const cls = codeEl.getAttribute?.('class') ?? '';
      const langMatch = cls.match(/language-(\S+)/);
      const lang = langMatch ? langMatch[1] : '';
      const code = codeEl.textContent ?? '';
      return `\n\n\`\`\`${lang}\n${code.replace(/\n$/, '')}\n\`\`\`\n\n`;
    },
  });

  // Fallback fenced code block for <pre> that lacks a language-class <code> child.
  // Handles bare <pre>text</pre> and <pre><code>text</code></pre> (no language).
  // fencedCodeBlockWithLang was added first, so Turndown gives it higher priority
  // (addRule uses unshift internally). The exclusion condition here is a safety
  // guard in case rule ordering changes in future.
  td.addRule('plainPreBlock', {
    filter: (node) => {
      const el = node as unknown as Element;
      if (el.nodeName !== 'PRE') return false;
      const firstChild = el.firstElementChild;
      // Exclude elements already handled by fencedCodeBlockWithLang
      if (
        firstChild?.nodeName === 'CODE' &&
        /language-/.test(firstChild?.getAttribute?.('class') ?? '')
      ) return false;
      return true;
    },
    replacement: (_content, node) => {
      const el = node as unknown as Element;
      const codeEl =
        el.firstElementChild?.nodeName === 'CODE'
          ? el.firstElementChild
          : null;
      const code = (codeEl?.textContent ?? el.textContent ?? '').replace(
        /\n$/,
        '',
      );
      return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    },
  });

  // GFM task list items: <li> with <input type="checkbox">
  td.addRule('taskListItem', {
    filter: (node) => {
      const el = node as unknown as Element;
      if (el.nodeName !== 'LI') return false;
      const first = el.firstElementChild;
      if (!first) return false;
      return (
        first.nodeName === 'INPUT' &&
        first.getAttribute?.('type') === 'checkbox'
      );
    },
    replacement: (content, node) => {
      const el = node as unknown as Element;
      const checkbox = el.firstElementChild!;
      const checked = checkbox.hasAttribute?.('checked') ?? false;
      const marker = checked ? '[x]' : '[ ]';
      // Remove the leading checkbox text from content
      const text = content.replace(/^\s*/, '').trim();
      return `${marker} ${text}\n`;
    },
  });

  // <mark> → ==highlighted==
  td.addRule('highlight', {
    filter: ['mark'],
    replacement: (content) => `==${content}==`,
  });

  // <sub> → ~subscript~
  td.addRule('subscript', {
    filter: ['sub'],
    replacement: (content) => `~${content}~`,
  });

  // <sup> → ^superscript^
  td.addRule('superscript', {
    filter: ['sup'],
    replacement: (content) => `^${content}^`,
  });

  // <kbd> → `key`
  td.addRule('keyboard', {
    filter: ['kbd'],
    replacement: (content) => `\`${content}\``,
  });

  // <u> → <u>underline</u> (preserve as raw HTML, no standard MD equivalent)
  td.addRule('underline', {
    filter: ['u', 'ins'],
    replacement: (content) => `<u>${content}</u>`,
  });

  // <abbr> → preserve as-is (no standard MD equivalent)
  td.addRule('abbreviation', {
    filter: ['abbr'],
    replacement: (content, node) => {
      const el = node as unknown as Element;
      const title = el.getAttribute?.('title');
      return title ? `<abbr title="${title}">${content}</abbr>` : content;
    },
  });

  // <dl>/<dt>/<dd> → definition list (render as bold term + indented definition)
  td.addRule('definitionList', {
    filter: ['dl'],
    replacement: (content) => `\n\n${content}\n\n`,
  });
  td.addRule('definitionTerm', {
    filter: ['dt'],
    replacement: (content) => `**${content.trim()}**\n`,
  });
  td.addRule('definitionDesc', {
    filter: ['dd'],
    replacement: (content) => `: ${content.trim()}\n\n`,
  });

  // <figure> with <figcaption>
  td.addRule('figure', {
    filter: ['figure'],
    replacement: (content) => `\n\n${content.trim()}\n\n`,
  });
  td.addRule('figcaption', {
    filter: ['figcaption'],
    replacement: (content) => `*${content.trim()}*\n`,
  });

  // <details>/<summary> → collapsible section (preserve as HTML)
  td.addRule('details', {
    filter: ['details'],
    replacement: (_content, node) => {
      const el = node as unknown as Element;
      const summary = el.querySelector?.('summary');
      const summaryText = summary?.textContent?.trim() ?? '';
      // Remove summary from innerHTML to get just the body
      const bodyHtml = (el.innerHTML ?? '')
        .replace(/<summary[\s\S]*?<\/summary>/i, '')
        .trim();
      const bodyMd = td.turndown(bodyHtml);
      return `\n\n<details>\n<summary>${summaryText}</summary>\n\n${bodyMd}\n\n</details>\n\n`;
    },
  });

  // <video> → link
  td.addRule('video', {
    filter: ['video'],
    replacement: (_content, node) => {
      const el = node as unknown as Element;
      const src = el.getAttribute?.('src') ??
        el.querySelector?.('source')?.getAttribute?.('src') ?? '';
      return src ? `\n\n[Video](${src})\n\n` : '';
    },
  });

  // <audio> → link
  td.addRule('audio', {
    filter: ['audio'],
    replacement: (_content, node) => {
      const el = node as unknown as Element;
      const src = el.getAttribute?.('src') ??
        el.querySelector?.('source')?.getAttribute?.('src') ?? '';
      return src ? `\n\n[Audio](${src})\n\n` : '';
    },
  });

  // Remove Table of Contents navigation blocks (common in AsciiDoc/Antora HTML)
  td.addRule('removeToc', {
    filter: (node) => {
      const el = node as unknown as Element;
      return el.nodeName === 'DIV' && el.getAttribute?.('id') === 'toc';
    },
    replacement: () => '',
  });

  // Strip dangerous / non-content elements
  td.remove(['script', 'style', 'noscript', 'iframe', 'object', 'embed']);

  return td;
}

function getTableRows(table: Element): Element[] {
  const rows: Element[] = [];

  for (const child of getElementChildren(table)) {
    const name = child.nodeName.toUpperCase();
    if (name === 'TR') {
      rows.push(child);
      continue;
    }
    if (name === 'THEAD' || name === 'TBODY' || name === 'TFOOT') {
      for (const row of getElementChildren(child)) {
        if (row.nodeName.toUpperCase() === 'TR') rows.push(row);
      }
    }
  }

  return rows;
}

function getRowCells(row: Element): Element[] {
  return getElementChildren(row).filter((child) => {
    const name = child.nodeName.toUpperCase();
    return name === 'TD' || name === 'TH';
  });
}

function getElementChildren(node: Element): Element[] {
  const { children, childNodes } = node as Element & {
    childNodes?: ArrayLike<ChildNode>;
  };

  if (children) return Array.from(children);

  return Array.from(childNodes ?? []).filter(
    (child): child is Element => child.nodeType === 1,
  );
}

// ── Helper: extract <body> from full HTML document ─────────────────────────

export function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
}

/** Strip on* event attributes from HTML to prevent accidental XSS in intermediate DOM */
export function stripEventHandlers(html: string): string {
  return html.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

/** Pre-strip <script>, <style>, <noscript> tags via regex before DOM parsing */
export function stripDangerousTags(html: string): string {
  return html
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s>][\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s>][\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '');
}

/** Extract the <title> text from an HTML document */
export function extractHtmlTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return undefined;
  const title = match[1].trim();
  return title || undefined;
}
