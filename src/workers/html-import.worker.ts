/**
 * Web Worker for HTML → Markdown conversion.
 *
 * Runs turndown off the main thread so the UI stays responsive during
 * conversion of large HTML files. Uses linkedom to provide the minimal
 * DOM API that turndown requires.
 *
 * Shared conversion logic lives in html-import-core.ts (Vite bundles it in).
 */

import { parseHTML } from 'linkedom';
import {
  createTurndownService,
  extractBody,
  stripEventHandlers,
  stripDangerousTags,
  extractHtmlTitle,
} from '../lib/markdown/html-import-core';

// ── Bootstrap DOM for turndown ──────────────────────────────────────────────
// linkedom provides a minimal JSDOM implementation so turndown can parse HTML
// without needing a real browser document.
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
