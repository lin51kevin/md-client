/// <reference lib="webworker" />
import { computeAlignedDiff, type DiffOptions } from './diff-core';

interface DiffRequest {
  id: number;
  a: string;
  b: string;
  options: DiffOptions;
}

self.onmessage = (e: MessageEvent<DiffRequest>) => {
  const { id, a, b, options } = e.data;
  try {
    const result = computeAlignedDiff(a, b, options);
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
