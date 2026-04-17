/**
 * F008 — Mermaid 图表渲染
 *
 * 检测 Markdown 中的 ```mermaid 代码块，将其渲染为 SVG。
 * 使用 mermaid.js 进行服务端/客户端渲染。
 */

import { escapeHtml } from './utils/html-safety';
import { toErrorMessage } from './utils/errors';

let mermaidInitialized = false;
/** Module-level counter ensures globally unique DOM IDs across repeated renderMermaid calls */
let mermaidIdCounter = 0;

/**
 * 重置 Mermaid 初始化状态（仅供测试使用）
 */
export function resetMermaidInit(): void {
  mermaidInitialized = false;
}

/**
 * 初始化 Mermaid（只执行一次）
 */
export async function initMermaid(): Promise<typeof import('mermaid')> {
  const m = await import('mermaid');
  if (!mermaidInitialized) {
    // htmlLabels: false → 使用 SVG <text> 而非 <foreignObject>。
    // <foreignObject> 的 HTML 内容在 Milkdown Crepe 的 DOMPurify + innerHTML
    // 管道中会丢失，导致节点标签完全不可见。
    //
    // 必须同时设置顶层 htmlLabels 和 flowchart.htmlLabels：
    // Mermaid 11.x 的 labelHelper 直接读 config.htmlLabels（顶层），
    // 不经过 getEffectiveHtmlLabels()，因此光设 flowchart.htmlLabels 不够。
    //
    // themeCSS 注入到 SVG 内部 <style>（带 #svgId 作用域），
    // 确保 text fill 不受外层 CSS currentColor 继承影响。
    m.default.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
      fontFamily: 'sans-serif',
      suppressErrorRendering: false,
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      sequence: { useMaxWidth: false },
      themeVariables: {
        primaryTextColor: '#1f1f1f',
        nodeTextColor: '#1f1f1f',
        lineColor: '#333',
      },
      themeCSS: `
        text, tspan { fill: #1f1f1f !important; }
        .nodeLabel, .edgeLabel, .label { color: #1f1f1f !important; }
      `,
    });
    mermaidInitialized = true;
  }
  return m;
}

/**
 * 渲染文本中的 Mermaid 图表为 SVG
 *
 * @param text - 包含 ```mermaid 代码块的 Markdown 文本
 * @returns 替换后的文本（mermaid 块变为 <div class="mermaid">...<svg>...</div>）
 */
export async function renderMermaid(text: string): Promise<string> {
  if (!text || !text.includes('mermaid')) return text;

  const { default: mermaid } = await initMermaid();

  // 匹配 ```mermaid ... ``` 代码块（非贪婪，支持多行，兼容 LF/CRLF）
  const mermaidRe = /```mermaid\r?\n([\s\S]*?)```/g;

  let idCounter = mermaidIdCounter;
  const results = await Promise.all(
    [...text.matchAll(mermaidRe)].map(async (match) => {
      const code = match[1].trim();
      const id = `mermaid-${idCounter++}`;
      mermaidIdCounter = idCounter;
      try {
        const { svg } = await mermaid.render(id, code);
        return { fullMatch: match[0], replacement: svg };
      } catch (err) {
        // 渲染失败时返回带错误信息的占位符
        return {
          fullMatch: match[0],
          replacement: `<div class="mermaid-error" style="color:red;padding:8px;border:1px solid red;">Mermaid render error: ${escapeHtml(toErrorMessage(err))}</div>`,
        };
      }
    })
  );

  // 替换所有 mermaid 块
  let result = text;
  for (const r of results) {
    result = result.replace(r.fullMatch, r.replacement);
  }

  return result;
}
