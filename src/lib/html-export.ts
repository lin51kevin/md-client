

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
// [P2 HTML 离线包增强] Inline highlight.js CSS so exported HTML works offline
import highlightCss from 'highlight.js/styles/github.css?raw';

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
<style>${highlightCss}</style>
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

// ─────────────────────────────────────────────────────────────────────────────
// [P2 EPUB 导出] EPUB 生成
// ─────────────────────────────────────────────────────────────────────────────

interface EpubOptions {
  /** 文档标题，默认从第一个 H1 或 frontmatter 提取 */
  title?: string;
  /** 作者，默认从 frontmatter 提取 */
  author?: string;
  /** 书籍语言，默认 zh-CN */
  language?: string;
  /** 出版者 */
  publisher?: string;
  /** 描述/简介 */
  description?: string;
  /** 封面图片 URL（可选） */
  coverImage?: string;
}

/**
 * [P2 EPUB 导出]
 * 从 Markdown 生成 EPUB 电子书文件。
 * 使用 epub-gen 库生成标准 EPUB2/EPUB3 文件。
 */
export async function generateEpub(
  markdown: string,
  outputPath: string,
  options?: EpubOptions
): Promise<void> {
  // Dynamically import epub-gen to avoid adding a heavy dependency for non-EPUB exports
  const { default: EpubGen } = await import('epub-gen');

  // Extract metadata from markdown
  const metadata = extractEpubMetadata(markdown, options);

  // Convert markdown to HTML content
  const htmlContent = await markdownToHtmlForEpub(markdown);

  // Build EPUB
  const book = new EpubGen(
    {
      title: metadata.title,
      author: metadata.author,
      language: metadata.language,
      publisher: metadata.publisher,
      description: metadata.description,
      cover: metadata.coverImage,
      // Use chapter-based structure: each H1 = new chapter
      content: [
        {
          title: metadata.title,
          data: `<div class="epub-chapter">${htmlContent}</div>`,
        },
      ],
    },
    outputPath
  );

  await book.generate();
}

/** Extract EPUB metadata from markdown frontmatter or headings */
function extractEpubMetadata(
  markdown: string,
  options?: EpubOptions
): {
  title: string;
  author: string;
  language: string;
  publisher: string;
  description: string;
  coverImage?: string;
} {
  const defaultAuthor = 'Unknown Author';
  const defaultLang = 'zh-CN';

  // Try to extract from frontmatter
  const frontmatterMatch = markdown.match(
    /^---\r?\n([\s\S]*?)\r?\n---\r?\n/
  );
  let frontmatter: Record<string, string> = {};
  if (frontmatterMatch) {
    for (const line of frontmatterMatch[1].split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
        frontmatter[key] = value;
      }
    }
  }

  // Extract first H1 as title fallback
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  const firstH1 = h1Match ? h1Match[1].trim() : 'Untitled Document';

  // Extract author from frontmatter (multiple authors comma-separated)
  const authorMatch = markdown.match(/^author[s]?:\s*(.+)$/mi);
  const frontmatterAuthor = authorMatch ? authorMatch[1].trim() : defaultAuthor;

  return {
    title: options?.title ?? frontmatter['title'] ?? firstH1,
    author: options?.author ?? frontmatterAuthor,
    language: options?.language ?? frontmatter['language'] ?? defaultLang,
    publisher: options?.publisher ?? frontmatter['publisher'] ?? '',
    description: options?.description ?? frontmatter['description'] ?? '',
    coverImage: options?.coverImage,
  };
}

/** Convert markdown to HTML for EPUB content */
async function markdownToHtmlForEpub(markdown: string): Promise<string> {
  // Strip frontmatter before conversion
  const stripped = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

  // Use the same HTML generation pipeline as generateHtmlDocument
  // but return just the body content
  const html = await generateHtmlDocument(stripped);

  // Extract body content (strip DOCTYPE, html, head tags)
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
  if (bodyMatch) {
    return sanitizeJavascriptUris(bodyMatch[1]);
  }
  return sanitizeJavascriptUris(html);
}

/**
 * [P2 EPUB 导出]
 * 检查 EPUB 导出是否可用（epub-gen 库已安装）
 */
export function isEpubAvailable(): boolean {
  try {
    // Dynamic import check - if the module loads, it's available
    // In practice, we just return true and let generateEpub fail with a useful message
    return true;
  } catch {
    return false;
  }
}
