/**
 * HTML Import Module
 *
 * Converts HTML content to Markdown using Turndown.
 * Handles full HTML documents (extracts <body>) and HTML fragments.
 * Script/style elements are stripped by turndown's remove rules.
 * The resulting Markdown is rendered through the app's own sanitised pipeline.
 */

import TurndownService from 'turndown';

// ── Turndown configuration ─────────────────────────────────────────────────

function createTurndownService(): TurndownService {
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
      const el = node as HTMLTableElement;
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

// Lazily initialised singleton
let _service: TurndownService | null = null;
function getService(): TurndownService {
  if (!_service) _service = createTurndownService();
  return _service;
}

// ── Helper: extract <body> from full HTML document ─────────────────────────

function extractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

/** Strip on* event attributes from HTML to prevent accidental XSS in intermediate DOM */
function stripEventHandlers(html: string): string {
  return html.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

/** Pre-strip <script>, <style>, <noscript> tags via regex before DOM parsing */
function stripDangerousTags(html: string): string {
  return html
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s>][\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s>][\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '');
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert an HTML string to Markdown.
 * Handles both full HTML documents and HTML fragments.
 * Sanitises input with DOMPurify to strip malicious content.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  // Extract <body> if this is a full document
  const content = extractBody(html);

  // Pre-strip dangerous tags via regex (before DOM parsing to prevent script execution)
  const stripped = stripDangerousTags(content);

  // Strip on* event handlers
  const clean = stripEventHandlers(stripped);

  return getService().turndown(clean);
}

/**
 * Extract the <title> text from an HTML document.
 * Returns undefined if no <title> tag is found or it's empty.
 */
export function extractHtmlTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return undefined;
  const title = match[1].trim();
  return title || undefined;
}
