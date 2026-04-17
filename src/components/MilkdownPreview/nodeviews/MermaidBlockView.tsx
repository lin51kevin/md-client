/**
 * renderMermaidPreview — Milkdown renderPreview API compatible function.
 *
 * Can be used directly in Crepe's featureConfigs[CrepeFeature.CodeMirror].renderPreview
 * to render mermaid code blocks as SVG diagrams.
 */

import { initMermaid } from '../../../lib/mermaid';
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

  const id = `milkdown-mermaid-${++mermaidCounter}`;
  initMermaid()
    .then(({ default: mermaid }) => mermaid.render(id, codeContent))
    .then(({ svg }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';
      wrapper.innerHTML = svg;

      // Force text visibility via inline !important styles — the highest CSS
      // specificity, immune to Mermaid's internal <style> and Crepe's resets.
      wrapper.querySelectorAll('text, tspan').forEach((el) => {
        (el as SVGElement).style.setProperty('fill', '#1f1f1f', 'important');
      });
      // Safety net for any foreignObject content (shouldn't exist with
      // htmlLabels: false, but guard against edge cases).
      wrapper.querySelectorAll('foreignObject div, .nodeLabel').forEach((el) => {
        (el as HTMLElement).style.setProperty('color', '#1f1f1f', 'important');
      });

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

/**
 * @deprecated Use renderMermaidPreview with Milkdown's renderPreview API instead.
 */
export function useMermaidBlock(_containerRef: React.RefObject<HTMLElement | null>) {
  // No-op: Mermaid rendering is now handled by renderMermaidPreview via Crepe's CodeMirror feature.
}
