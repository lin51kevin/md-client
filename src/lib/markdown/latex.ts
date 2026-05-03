/**
 * F007 — LaTeX 数学公式渲染
 *
 * Uses the katex-bridge to render LaTeX formulas via remark-math + rehype-katex.
 * Falls back to returning raw text if the KaTeX plugin is not activated.
 *
 * 支持：
 *   - 行内公式：$E=mc^2$
 *   - 块级公式：$$\int_0^1 x^2 dx$$
 *
 * 安全性：rehype-katex 内部处理转义，防止 XSS
 */

import { getKatexPlugin } from './katex-bridge';

/**
 * 将文本中的 LaTeX 公式转换为渲染后的 HTML
 *
 * @param text - 包含 LaTeX 公式的 Markdown/纯文本
 * @returns 转换后的文本（公式部分变为 <span>/<div> + KaTeX HTML）
 */
export async function renderLatex(text: string): Promise<string> {
  if (!text || !text.includes('$')) return text;

  const katex = getKatexPlugin();
  if (!katex) return text;

  const { unified } = await import('unified');
  const remarkParse = (await import('remark-parse')).default;
  const remarkRehype = (await import('remark-rehype')).default;
  const rehypeStringify = (await import('rehype-stringify')).default;

  const result = await unified()
    .use(remarkParse)
    .use(katex.remarkMath)
    .use(remarkRehype)
    .use(katex.rehypeKatex)
    .use(rehypeStringify)
    .process(text);

  return String(result);
}

/**
 * 检测文本中是否包含 LaTeX 公式
 * @deprecated 未被任何生产代码引用，保留仅供参考
 */
