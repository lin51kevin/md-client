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

  // GFM tables
  td.addRule('table', {
    filter: 'table',
    replacement: (_content, node) => {
      const el = node as unknown as HTMLTableElement;
      const rows = Array.from(el.rows);
      if (rows.length === 0) return '';

      const cellText = (cell: HTMLTableCellElement) =>
        cell.textContent?.trim().replace(/\|/g, '\\|') ?? '';

      const headerRow = rows[0];
      const headers = Array.from(headerRow.cells).map(cellText);
      const separator = headers.map(() => '---');

      const bodyRows = rows.slice(1).map(row =>
        Array.from(row.cells).map(cellText)
      );

      const lines = [
        `| ${headers.join(' | ')} |`,
        `| ${separator.join(' | ')} |`,
        ...bodyRows.map(row => `| ${row.join(' | ')} |`),
      ];
      return `\n\n${lines.join('\n')}\n\n`;
    },
  });

  // Strip dangerous / non-content elements
  td.remove(['script', 'style', 'noscript', 'iframe', 'object', 'embed']);

  return td;
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
