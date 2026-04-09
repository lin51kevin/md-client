/**
 * F008 — Mermaid 图表渲染
 *
 * 检测 Markdown 中的 ```mermaid 代码块，将其渲染为 SVG。
 * 使用 mermaid.js 进行服务端/客户端渲染。
 */

let mermaidInitialized = false;

/**
 * 重置 Mermaid 初始化状态（仅供测试使用）
 */
export function resetMermaidInit(): void {
  mermaidInitialized = false;
}

/**
 * 初始化 Mermaid（只执行一次）
 */
async function initMermaid(): Promise<typeof import('mermaid')> {
  const m = await import('mermaid');
  if (!mermaidInitialized) {
    // 在非浏览器环境下使用 SVG 字符串输出
    m.default.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
      // SSR/测试环境兼容配置
      suppressErrorRendering: false,
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

  // 匹配 ```mermaid ... ``` 代码块（非贪婪，支持多行）
  const mermaidRe = /```mermaid\n([\s\S]*?)```/g;

  let idCounter = 0;
  const results = await Promise.all(
    [...text.matchAll(mermaidRe)].map(async (match) => {
      const code = match[1].trim();
      const id = `mermaid-${idCounter++}`;
      try {
        const { svg } = await mermaid.render(id, code);
        return { fullMatch: match[0], replacement: svg };
      } catch (err) {
        // 渲染失败时返回带错误信息的占位符
        return {
          fullMatch: match[0],
          replacement: `<div class="mermaid-error" style="color:red;padding:8px;border:1px solid red;">⚠️ Mermaid render error: ${err instanceof Error ? err.message : String(err)}</div>`,
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
