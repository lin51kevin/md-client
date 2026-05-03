/**
 * renderMermaidPreview — Milkdown renderPreview API compatible function.
 *
 * Delegates to the mermaid-bridge for actual rendering.
 * When no Mermaid plugin is registered, shows a fallback message.
 */

import { isMermaidAvailable, getMermaidRenderer } from '../../../lib/markdown/mermaid-bridge';
import { toErrorMessage } from '../../../lib/utils/errors';

/**
 * Milkdown renderPreview 兼容的 Mermaid 渲染函数
 * 返回加载提示文本，异步通过 applyPreview 回调更新为 SVG
 */
let mermaidCounter = 0;

export function renderMermaidPreview(
  language: string,
  codeContent: string,
  applyPreview: (value: null | string | HTMLElement) => void
): string | null {
  if (language !== 'mermaid') return null;

  // Graceful degradation when no Mermaid plugin is registered
  if (!isMermaidAvailable()) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-unavailable';
    wrapper.innerHTML = `<pre style="background:var(--bg-secondary);padding:12px;border-radius:6px;overflow:auto;"><code>${escapeHtmlSimple(codeContent)}</code></pre><small style="color:var(--text-secondary);margin-top:4px;display:block;">Install the Mermaid plugin to render diagrams</small>`;
    applyPreview(wrapper);
    return '⚠ Mermaid plugin not available';
  }

  const id = `milkdown-mermaid-${++mermaidCounter}`;
  getMermaidRenderer()!.render(id, codeContent)
    .then(({ svg }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';
      wrapper.innerHTML = svg;
      applyPreview(wrapper);
    })
    .catch((err) => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'mermaid-error';
      errorDiv.style.cssText = 'color:red;padding:8px;border:1px solid red;border-radius:4px';
      errorDiv.textContent = `Mermaid render error: ${toErrorMessage(err)}`;
      applyPreview(errorDiv);
    });

  return '⏳ Rendering mermaid...';
}

function escapeHtmlSimple(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @deprecated Use renderMermaidPreview with Milkdown's renderPreview API instead.
 */
export function useMermaidBlock(_containerRef: React.RefObject<HTMLElement | null>) {
  // No-op: Mermaid rendering is now handled by renderMermaidPreview via Crepe's CodeMirror feature.
}
