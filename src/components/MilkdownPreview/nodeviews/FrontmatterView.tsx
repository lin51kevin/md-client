/**
 * FrontmatterView — Post-processing hook for MilkdownPreview.
 *
 * Detects YAML frontmatter at the beginning of content and renders it
 * as a metadata table in the DOM.
 */

import { useEffect, useCallback, useRef } from 'react';
import { extractFrontmatter } from '../../../lib/markdown-extensions';

export function useFrontmatter(
  containerRef: React.RefObject<HTMLElement | null>,
  content: string
) {
  const prevContentRef = useRef(content);

  const renderFrontmatter = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remove existing frontmatter panel
    const existing = container.querySelector('.frontmatter-block');
    if (existing) existing.remove();

    const fm = extractFrontmatter(content);
    if (Object.keys(fm).length === 0) return;

    const panel = document.createElement('div');
    panel.className = 'frontmatter-block';
    panel.setAttribute('aria-label', 'Document metadata');

    const table = document.createElement('table');
    table.className = 'fm-table';
    const tbody = document.createElement('tbody');

    for (const [key, val] of Object.entries(fm)) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.className = 'fm-key';
      th.textContent = key;
      const td = document.createElement('td');
      td.className = 'fm-val';
      td.textContent = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    panel.appendChild(table);

    // Insert at the top of the editor content area
    const editorEl = container.querySelector('.ProseMirror') || container;
    editorEl.insertBefore(panel, editorEl.firstChild);
  }, [containerRef, content]);

  useEffect(() => {
    if (content !== prevContentRef.current) {
      prevContentRef.current = content;
    }
    renderFrontmatter();
  }, [content, renderFrontmatter]);
}
