/**
 * renderMermaidPreview — Milkdown renderPreview API compatible function.
 *
 * Can be used directly in Crepe's featureConfigs[CrepeFeature.CodeMirror].renderPreview
 * to render mermaid code blocks as SVG diagrams.
 */

import { initMermaid } from '../../../lib/mermaid';

/**
 * Milkdown renderPreview 兼容的 Mermaid 渲染函数
 * 返回加载提示文本，异步通过 applyPreview 回调更新为 SVG
 */
export function renderMermaidPreview(
  language: string,
  codeContent: string,
  applyPreview: (value: null | string | HTMLElement) => void
): string | null {
  if (language !== 'mermaid') return null;

  const id = `milkdown-mermaid-${Date.now()}`;
  initMermaid()
    .then(({ default: mermaid }) => mermaid.render(id, codeContent))
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
      errorDiv.textContent = `Mermaid render error: ${err instanceof Error ? err.message : String(err)}`;
      applyPreview(errorDiv);
    });

  return '⏳ Rendering mermaid...';
}

/**
 * @deprecated Use renderMermaidPreview with Milkdown's renderPreview API instead.
 */
export function useMermaidBlock(_containerRef: React.RefObject<HTMLElement | null>) {
  // No-op: Mermaid rendering is now handled by renderMermaidPreview via Crepe's CodeMirror feature.
}
