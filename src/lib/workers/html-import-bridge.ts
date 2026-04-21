/**
 * Bridge between main thread and html-import Worker.
 *
 * Wraps Worker lifecycle into a simple Promise API with progress callback
 * and cancellation support.
 */

import type {
  WorkerRequest,
  WorkerOutMsg,
  WorkerProgressMsg,
} from '../../workers/html-import.worker';

export type ProgressStage = WorkerProgressMsg['stage'];

export interface ConvertProgress {
  stage: ProgressStage;
  percent: number;
}

export interface ConvertResult {
  markdown: string;
  title?: string;
}

export interface ConvertHandle {
  /** Resolves when conversion is complete */
  promise: Promise<ConvertResult>;
  /** Terminate the Worker to cancel the operation */
  cancel: () => void;
}

/**
 * Convert HTML to Markdown in a Web Worker.
 *
 * Creates a new Worker instance per call (cheap — the heavy part is
 * turndown itself, not Worker startup). The Worker is terminated
 * automatically when done or on error.
 */
export function convertHtmlInWorker(
  html: string,
  onProgress?: (progress: ConvertProgress) => void,
): ConvertHandle {
  const worker = new Worker(
    new URL('../../workers/html-import.worker.ts', import.meta.url),
    { type: 'module' },
  );

  let settled = false;

  const promise = new Promise<ConvertResult>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<WorkerOutMsg>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'progress':
          onProgress?.({ stage: msg.stage, percent: msg.percent });
          break;
        case 'result':
          settled = true;
          worker.terminate();
          resolve({ markdown: msg.markdown, title: msg.title });
          break;
        case 'error':
          settled = true;
          worker.terminate();
          reject(new Error(msg.message));
          break;
      }
    };

    worker.onerror = (ev) => {
      if (!settled) {
        settled = true;
        worker.terminate();
        reject(new Error(ev.message || 'Worker error'));
      }
    };

    // Send the HTML to convert
    worker.postMessage({ type: 'convert', html } satisfies WorkerRequest);
  });

  const cancel = () => {
    if (!settled) {
      settled = true;
      worker.terminate();
    }
  };

  return { promise, cancel };
}
