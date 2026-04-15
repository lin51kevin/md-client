import { useState, useCallback } from 'react';

/**
 * Manages preview renderers registered by plugins.
 *
 * Returns stable `register` / `unregister` callbacks and a `renderers` map
 * keyed by node type (e.g. 'blockquote', 'p', 'h1').
 */
export function usePreviewRenderers() {
  const [renderers, setRenderers] = useState<Map<string, unknown>>(() => new Map());

  const registerPreviewRenderer = useCallback((nodeType: string, renderFn: unknown) => {
    setRenderers((prev) => {
      const next = new Map(prev);
      next.set(nodeType, renderFn);
      return next;
    });
  }, []);

  const unregisterPreviewRenderer = useCallback((nodeType: string) => {
    setRenderers((prev) => {
      if (!prev.has(nodeType)) return prev;
      const next = new Map(prev);
      next.delete(nodeType);
      return next;
    });
  }, []);

  return { renderers, registerPreviewRenderer, unregisterPreviewRenderer };
}
