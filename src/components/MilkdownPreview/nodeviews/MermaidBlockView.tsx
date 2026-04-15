/**
 * MermaidBlockView — Post-processing hook for MilkdownPreview.
 *
 * Scans the Milkdown DOM for code blocks with language="mermaid"
 * and renders them as SVG diagrams.
 */

import { useEffect, useRef } from 'react';
import { initMermaid } from '../../../lib/mermaid';

let mermaidIdCounter = 0;

export function useMermaidBlock(containerRef: React.RefObject<HTMLElement | null>) {
  const renderedRef = useRef(new Set<Element>());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const codeBlocks = container.querySelectorAll(
      'pre[data-language="mermaid"], pre code.mermaid, pre code[className*="mermaid"]'
    );

    codeBlocks.forEach((block) => {
      if (renderedRef.current.has(block)) return;
      renderedRef.current.add(block);

      const code = block.textContent || '';
      if (!code.trim()) return;

      const id = `mermaid-${mermaidIdCounter++}`;

      initMermaid()
        .then(({ default: mermaid }) => mermaid.render(id, code))
        .then(({ svg }) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'mermaid-diagram';
          wrapper.innerHTML = svg;
          block.closest('pre')?.replaceWith(wrapper);
        })
        .catch((err) => {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'mermaid-error';
          errorDiv.style.cssText = 'color:red;padding:8px;border:1px solid red;border-radius:4px';
          errorDiv.textContent = `Mermaid render error: ${err instanceof Error ? err.message : String(err)}`;
          block.closest('pre')?.replaceWith(errorDiv);
        });
    });
  }, [containerRef]);

  // MutationObserver for new mermaid blocks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      const codeBlocks = container.querySelectorAll(
        'pre[data-language="mermaid"], pre code.mermaid, pre code[className*="mermaid"]'
      );

      codeBlocks.forEach((block) => {
        if (renderedRef.current.has(block)) return;
        renderedRef.current.add(block);

        const code = block.textContent || '';
        if (!code.trim()) return;

        const id = `mermaid-${mermaidIdCounter++}`;

        initMermaid()
          .then(({ default: mermaid }) => mermaid.render(id, code))
          .then(({ svg }) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'mermaid-diagram';
            wrapper.innerHTML = svg;
            block.closest('pre')?.replaceWith(wrapper);
          })
          .catch((err) => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'mermaid-error';
            errorDiv.style.cssText = 'color:red;padding:8px;border:1px solid red;border-radius:4px';
            errorDiv.textContent = `Mermaid render error: ${err instanceof Error ? err.message : String(err)}`;
            block.closest('pre')?.replaceWith(errorDiv);
          });
      });
    });

    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerRef]);
}
