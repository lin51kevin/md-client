/**
 * F005 — 导出 HTML
 *
 * 将 Markdown 转换为完整 HTML 文档，用于导出功能。
 * 复用项目已有的 remark/rehype 插件链保持渲染一致性。
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Inline KaTeX CSS so exported HTML works offline (no CDN dependency)
import katexCss from 'katex/dist/katex.min.css?raw';

export interface HtmlExportOptions {
  /** 文档 <title>（默认取第一个 h1 或 "Untitled"） */
  title?: string;
  /** 额外注入的 CSS 样式 */
  css?: string;
}

/** 默认内嵌样式：保证导出的 HTML 离线可读 */
const DEFAULT_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
  background: #fff;
  padding: 2rem 4rem;
  max-width: 860px;
  margin: 0 auto;
}
h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; line-height: 1.3; font-weight: 600; }
h1 { font-size: 2em; border-bottom: 1px solid #e1e4e8; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.25em; }
p { margin-bottom: 1em; }
a { color: #0366d6; text-decoration: none; }
a:hover { text-decoration: underline; }
code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.85em;
  background: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}
pre {
  background: #f6f8fa;
  border: 1px solid #d1d5da;
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  margin-bottom: 1em;
}
pre code {
  background: none;
  padding: 0;
  font-size: 0.9em;
  line-height: 1.45;
}
blockquote {
  border-left: 4px solid #dfe2e5;
  color: #6a737d;
  padding: 0.5em 1em;
  margin: 0 0 1em 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
}
th, td {
  border: 1px solid #d1d5da;
  padding: 0.5em 0.75em;
  text-align: left;
}
th {
  background: #f6f8fa;
  font-weight: 600;
}
img { max-width: 100%; height: auto; }
hr { border: none; border-top: 1px solid #e1e4e8; margin: 2em 0; }
ul, ol { padding-left: 2em; margin-bottom: 1em; }
li { margin-bottom: 0.25em; }
input[type="checkbox"] { margin-right: 0.4em; }
`;

/**
 * 将 Markdown 字符串转换为 HTML 片段（不含 <html> 外壳）
 *
 * 使用与 MarkdownPreview 组件一致的插件链确保渲染结果一致。
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) return '';

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkDirectiveRehype)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

/**
 * 从 HTML 中提取第一个 h1 的文本内容作为默认标题
 */
function extractTitle(html: string): string {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  if (match) {
    // 去掉内部 HTML 标签，只留文本
    return match[1].replace(/<[^>]+>/g, '').trim();
  }
  return 'Untitled';
}

/**
 * 生成完整的 HTML 文档字符串
 *
 * @param markdown - 源 Markdown 文本
 * @param options  - 导出选项（标题、自定义 CSS）
 * @returns 完整的 HTML 文档字符串（可直接写入 .html 文件）
 */
export async function generateHtmlDocument(
  markdown: string,
  options: HtmlExportOptions = {},
): Promise<string> {
  const bodyHtml = sanitizeJavascriptUris(await markdownToHtml(markdown));
  const title = options.title ?? extractTitle(bodyHtml);
  const customCss = options.css ? `\n${options.css}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${DEFAULT_CSS}${customCss}</style>
<style>${katexCss}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/** 简单的 HTML 实体转义（防止 title 注入） */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 移除危险的 javascript: 协议链接（防御性 XSS 防护） */
function sanitizeJavascriptUris(html: string): string {
  return html.replace(
    /href\s*=\s*["']javascript:[^"']*["']/gi,
    'href="#javascript-blocked"'
  );
}
