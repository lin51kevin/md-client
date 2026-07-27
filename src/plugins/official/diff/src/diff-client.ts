import { computeAlignedDiff, type DiffOptions, type DiffResult } from './diff-core';

/** Runtime location of the compiled worker bundle (built by build-plugins.mjs). */
const WORKER_URL = '/plugins/marklite-diff/dist/diff.worker.js';

interface PendingRequest {
  resolve: (result: DiffResult) => void;
  a: string;
  b: string;
  options: DiffOptions;
}

let worker: Worker | null = null;
let workerBroken = false;
let requestCounter = 0;
const pending = new Map<number, PendingRequest>();

/** Resolve a pending request on the main thread as a graceful fallback. */
function fallback(req: PendingRequest): void {
  try {
    req.resolve(computeAlignedDiff(req.a, req.b, req.options));
  } catch {
    req.resolve({ rows: [], blocks: [], stats: { added: 0, removed: 0, modified: 0 }, truncated: true });
  }
}

/** Lazily create the diff worker; returns null if the environment forbids it. */
function ensureWorker(): Worker | null {
  if (worker || workerBroken) return worker;
  try {
    const w = new Worker(WORKER_URL, { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; result?: DiffResult; error?: string }>) => {
      const { id, result, error } = e.data;
      const req = pending.get(id);
      if (!req) return;
      pending.delete(id);
      if (error || !result) fallback(req);
      else req.resolve(result);
    };
    w.onerror = () => {
      // Worker failed to load or crashed: fall back for everything in flight
      // and disable the worker for subsequent requests.
      workerBroken = true;
      for (const req of pending.values()) fallback(req);
      pending.clear();
      try { w.terminate(); } catch { /* ignore */ }
      worker = null;
    };
    worker = w;
    return w;
  } catch {
    workerBroken = true;
    return null;
  }
}

/**
 * Compute an aligned diff, off-loading to a Web Worker when available so large
 * inputs never block the UI. Stale requests can be dropped via the returned
 * `cancel` function; a cancelled request will never resolve.
 */
export function requestDiff(
  a: string,
  b: string,
  options: DiffOptions,
): { promise: Promise<DiffResult>; cancel: () => void } {
  const id = ++requestCounter;
  const w = ensureWorker();

  if (!w) {
    let cancelled = false;
    const promise = new Promise<DiffResult>((resolve) => {
      if (cancelled) return;
      fallback({ resolve, a, b, options });
    });
    return { promise, cancel: () => { cancelled = true; } };
  }

  const promise = new Promise<DiffResult>((resolve) => {
    pending.set(id, { resolve, a, b, options });
    w.postMessage({ id, a, b, options });
  });
  return { promise, cancel: () => { pending.delete(id); } };
}

/** Terminate the worker and drop all pending work. Call on plugin deactivate. */
export function terminateDiffWorker(): void {
  if (worker) {
    try { worker.terminate(); } catch { /* ignore */ }
    worker = null;
  }
  pending.clear();
  workerBroken = false;
}
