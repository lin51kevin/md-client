/**
 * useHtmlBlocks — Post-processing hook for MilkdownPreview.
 *
 * Milkdown's built-in `html` node schema stores raw HTML as a ProseMirror
 * atom node and renders it via `textContent`, which means content like
 * `<p align="center">...</p>` appears as literal text instead of HTML.
 *
 * This hook runs after each content change, finds all `span[data-type="html"]`
 * elements that still contain plain text, and re-renders them as actual HTML
 * using DOMPurify sanitization.
 */

import { useEffect } from 'react';
import DOMPurify from 'dompurify';

/** Allow structural HTML attributes like align, style, etc. */
const PURIFY_ADD_ATTR = ['align', 'valign', 'width', 'height', 'colspan', 'rowspan', 'bgcolor', 'border', 'cellpadding', 'cellspacing'];

export function useHtmlBlocks(
  containerRef: React.RefObject<HTMLElement | null>,
  content: string,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      const spans = container.querySelectorAll<HTMLSpanElement>('span[data-type="html"]');
      spans.forEach((span) => {
        // Skip if already rendered (has child elements, not just text)
        if (span.childElementCount > 0) return;
        const raw = span.dataset.value ?? span.textContent ?? '';
        if (!raw.trim()) return;
        span.innerHTML = DOMPurify.sanitize(raw, { ADD_ATTR: PURIFY_ADD_ATTR });
      });
    });
  }, [content, containerRef]);
}
