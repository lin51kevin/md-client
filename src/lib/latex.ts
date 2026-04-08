/**
 * F007 — LaTeX 数学公式渲染
 *
 * 使用 remark-math + rehype-katex 管线将 LaTeX 公式转换为 HTML。
 * 支持：
 *   - 行内公式：$E=mc^2$
 *   - 块级公式：$$\int_0^1 x^2 dx$$
 *
 * 安全性：rehype-katex 内部处理转义，防止 XSS
 */

/**
 * 将文本中的 LaTeX 公式转换为渲染后的 HTML
 *
 * @param text - 包含 LaTeX 公式的 Markdown/纯文本
 * @returns 转换后的文本（公式部分变为 <span>/<div> + KaTeX HTML）
 */
export async function renderLatex(text: string): Promise<string> {
  if (!text || !text.includes('$')) return text;

  const { unified } = await import('unified');
  const remarkParse = (await import('remark-parse')).default;
  const remarkMath = (await import('remark-math')).default;
  const remarkRehype = (await import('remark-rehype')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  const rehypeStringify = (await import('rehype-stringify')).default;

  const result = await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(text);

  return String(result);
}

/**
 * 检测文本中是否包含 LaTeX 公式
 */
export function hasLatex(text: string): boolean {
  return /\$[\s\S]+?\$/.test(text);
}
