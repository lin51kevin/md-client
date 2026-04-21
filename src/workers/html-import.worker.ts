/**
 * Web Worker for HTML → Markdown conversion.
 *
 * Runs turndown off the main thread so the UI stays responsive during
 * conversion of large HTML files.
 *
 * Important: Turndown inspects global DOM APIs while its module is evaluated,
 * so we must bootstrap the Worker DOM before dynamically importing the shared
 * conversion module.
 */

import { installHtmlImportDomGlobals } from './html-import-dom';

installHtmlImportDomGlobals();

type HtmlImportCore = typeof import('../lib/markdown/html-import-core');

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

let runtimePromise: Promise<{
  core: HtmlImportCore;
  service: ReturnType<HtmlImportCore['createTurndownService']>;
}> | null = null;

function getRuntime() {
  runtimePromise ??= import('../lib/markdown/html-import-core').then((core) => ({
    core,
    service: core.createTurndownService(),
  }));
  return runtimePromise;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  try {
    const { html } = e.data;
    const { core, service } = await getRuntime();

    // Stage 1: strip dangerous tags (regex, fast even for large files)
    self.postMessage({ type: 'progress', stage: 'stripping', percent: 10 } satisfies WorkerProgressMsg);
    const body = core.extractBody(html);
    const stripped = core.stripDangerousTags(body);
    const clean = core.stripEventHandlers(stripped);

    // Stage 2: turndown conversion (the heavy part)
    self.postMessage({ type: 'progress', stage: 'converting', percent: 30 } satisfies WorkerProgressMsg);
    const markdown = service.turndown(clean);

    // Extract title from original HTML
    const title = core.extractHtmlTitle(html);

    self.postMessage({ type: 'progress', stage: 'done', percent: 100 } satisfies WorkerProgressMsg);
    self.postMessage({ type: 'result', markdown, title } satisfies WorkerResultMsg);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message: msg } satisfies WorkerErrorMsg);
  }
};
