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
 *
 * Supported embedded content:
 *   - <video>: local/remote video with controls, poster, autoplay, loop, muted
 *   - <iframe>: sandboxed embeds for YouTube, Bilibili, etc.
 */

import { useEffect } from 'react';
import DOMPurify from 'dompurify';

/** Allow structural HTML attributes like align, style, etc. */
const PURIFY_ADD_ATTR = [
  'align', 'valign', 'width', 'height', 'colspan', 'rowspan',
  'bgcolor', 'border', 'cellpadding', 'cellspacing',
  // Video attributes
  'controls', 'autoplay', 'loop', 'muted', 'poster', 'preload',
  'playsinline', 'src', 'type',
  // Iframe attributes
  'allow', 'allowfullscreen', 'loading', 'sandbox', 'title',
];

/** Tags DOMPurify strips by default but we want to allow */
const PURIFY_ADD_TAGS = ['video', 'source', 'iframe'];

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
        const clean = DOMPurify.sanitize(raw, {
          ADD_TAGS: PURIFY_ADD_TAGS,
          ADD_ATTR: PURIFY_ADD_ATTR,
        });
        span.innerHTML = clean;

        // Post-process: wrap <video> and <iframe> in responsive containers
        span.querySelectorAll('video').forEach((video) => {
          if (!video.parentElement?.classList.contains('video-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-container';
            video.parentNode?.insertBefore(wrapper, video);
            wrapper.appendChild(video);
          }
        });
        span.querySelectorAll('iframe').forEach((iframe) => {
          // Enforce sandbox: if the author omitted it, apply a safe default
          // so the iframe cannot execute scripts in an unrestricted context.
          if (!iframe.hasAttribute('sandbox')) {
            iframe.setAttribute(
              'sandbox',
              'allow-scripts allow-same-origin allow-popups allow-presentation',
            );
          }
          if (!iframe.parentElement?.classList.contains('iframe-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'iframe-container';
            iframe.parentNode?.insertBefore(wrapper, iframe);
            wrapper.appendChild(iframe);
          }
        });
      });
    });
  }, [content, containerRef]);
}
