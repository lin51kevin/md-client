/**
 * Web Worker for HTML → Markdown conversion.
 *
 * Runs turndown off the main thread so the UI stays responsive during
 * conversion of large HTML files.  Uses linkedom to provide the minimal
 * DOM API that turndown requires.
 */

import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

// ── Bootstrap DOM for turndown ──────────────────────────────────────────────
const { document: linkedDocument } = parseHTML('<!doctype html><html><body></body></html>');
(globalThis as unknown as Record<string, unknown>).document = linkedDocument;

// ── Message protocol ────────────────────────────────────────────────────────

export interface WorkerRequest {
  type: 'convert';
  html: string;
}

export interface WorkerProgressMsg {
  type: 'progress';
  stage: 'stripping' | 'converting' | 'done';
  percent: number;
}

export interface WorkerResultMsg {
  type: 'result';
  markdown: string;
  title?: string;
}

export interface WorkerErrorMsg {
  type: 'error';
  message: string;
}

export type WorkerOutMsg = WorkerProgressMsg | WorkerResultMsg | WorkerErrorMsg;

// ── Turndown setup (mirrors html-import.ts) ─────────────────────────────────

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

  td.addRule('strikethrough', {
    filter: ['del', 's'],
    replacement: (content) => `~~${content}~~`,
  });

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
      const bodyRows = rows.slice(1).map(row => Array.from(row.cells).map(cellText));
      const lines = [
        `| ${headers.join(' | ')} |`,
        `| ${separator.join(' | ')} |`,
        ...bodyRows.map(row => `| ${row.join(' | ')} |`),
      ];
      return `\n\n${lines.join('\n')}\n\n`;
    },
  });

  td.remove(['script', 'style', 'noscript', 'iframe', 'object', 'embed']);
  return td;
}

// ── Helpers (same as html-import.ts) ────────────────────────────────────────

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

function stripDangerousTags(html: string): string {
  return html
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s>][\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s>][\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '');
}

function stripEventHandlers(html: string): string {
  return html.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

function extractHtmlTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return undefined;
  const title = m[1].trim();
  return title || undefined;
}

// ── Worker entry point ──────────────────────────────────────────────────────

const service = createTurndownService();

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  try {
    const { html } = e.data;

    // Stage 1: strip dangerous tags (regex, fast even for large files)
    self.postMessage({ type: 'progress', stage: 'stripping', percent: 10 } satisfies WorkerProgressMsg);
    const body = extractBody(html);
    const stripped = stripDangerousTags(body);
    const clean = stripEventHandlers(stripped);

    // Stage 2: turndown conversion (the heavy part)
    self.postMessage({ type: 'progress', stage: 'converting', percent: 30 } satisfies WorkerProgressMsg);
    const markdown = service.turndown(clean);

    // Extract title from original HTML
    const title = extractHtmlTitle(html);

    self.postMessage({ type: 'progress', stage: 'done', percent: 100 } satisfies WorkerProgressMsg);
    self.postMessage({ type: 'result', markdown, title } satisfies WorkerResultMsg);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message: msg } satisfies WorkerErrorMsg);
  }
};
