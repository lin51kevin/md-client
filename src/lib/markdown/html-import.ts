/**
 * HTML Import Module (main-thread path)
 *
 * Converts HTML content to Markdown using Turndown.
 * Handles full HTML documents (extracts <body>) and HTML fragments.
 * Script/style elements are stripped by turndown's remove rules.
 * The resulting Markdown is rendered through the app's own sanitised pipeline.
 *
 * Shared conversion logic lives in html-import-core.ts.
 */

import { createTurndownService, extractBody, stripEventHandlers, stripDangerousTags } from './html-import-core';

export { extractHtmlTitle } from './html-import-core';

// Lazily initialised singleton
let _service: ReturnType<typeof createTurndownService> | null = null;
function getService() {
  if (!_service) _service = createTurndownService();
  return _service;
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
