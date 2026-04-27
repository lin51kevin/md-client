/**
 * HTML Export Module
 *
 * Single remark/rehype pipeline for Markdown → HTML conversion.
 * DOMPurify sanitisation applied uniformly to all exported content.
 */

import DOMPurify from 'dompurify';
import { escapeHtml } from '../utils/html-safety';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { CORE_REMARK_PLUGINS } from './pipeline';
import { extractToc } from './toc';
import katexCss from 'katex/dist/katex.min.css?raw';
import highlightCss from 'highlight.js/styles/github.css?raw';

// ── Shared DOMPurify configuration ─────────────────────────────────────────
// Allows KaTeX MathML + SVG output while blocking dangerous URIs & attributes.
const DOMPURIFY_CONFIG = {
  ADD_TAGS: [
    // MathML elements used by KaTeX
    'math', 'semantics', 'mrow', 'mi', 'mo', 'mspace', 'mtext',
    'mfrac', 'msup', 'msub', 'msubsup', 'munder', 'mover',
    'munderover', 'mpadded', 'mtable', 'mtr', 'mtd', 'merror',
    'annotation', 'annotation-xml',
    // SVG elements used by KaTeX font glyphs
    'svg', 'path', 'g', 'use', 'defs', 'symbol', 'marker',
  ],
  ADD_ATTR: [
    'xmlns', 'xlink:href', 'viewBox', 'd', 'fill', 'stroke',
    'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'stroke-dasharray', 'stroke-dashoffset', 'width', 'height',
    'display', 'position', 'overflow', 'color',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp|mailto|tel|file|data):|[^a-z]|[a-z+.-]+(?:\/|$))/i,
};

/** Run DOMPurify with the shared KaTeX-safe configuration */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ...DOMPURIFY_CONFIG, RETURN_TRUSTED_TYPE: false }) as unknown as string;
}

// ── Public types ───────────────────────────────────────────────────────────

export interface HtmlExportOptions {
  /** 文档 <title>（默认取第一个 h1 或 "Untitled"） */
  title?: string;
  /** 额外注入的 CSS 样式 */
  css?: string;
}

// ── Default CSS ────────────────────────────────────────────────────────────

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
/* TOC styles */
nav.toc {
  background: #f8f9fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 1em 1.5em;
  margin-bottom: 2em;
}
nav.toc summary {
  font-weight: 600;
  font-size: 1.1em;
  cursor: pointer;
  margin-bottom: 0.5em;
}
nav.toc ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
nav.toc ul ul { padding-left: 1.2em; }
nav.toc li { margin-bottom: 0.2em; }
nav.toc a { color: #0366d6; text-decoration: none; }
nav.toc a:hover { text-decoration: underline; }
`;

// ── Core conversion ────────────────────────────────────────────────────────

/**
 * Convert Markdown to an HTML fragment using the remark/rehype pipeline.
 * The result is sanitised with DOMPurify.
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) return '';
  const result = await unified()
    .use(remarkParse)
    .use([...CORE_REMARK_PLUGINS])
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight, { detect: true })
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(markdown);
  return sanitizeHtml(String(result));
}

/** Extract first h1 text from an HTML string */
function extractTitle(html: string): string {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  if (match) return match[1].replace(/<[^>]+>/g, '').trim();
  return 'Untitled';
}

/**
 * Build an HTML TOC (table of contents) navigation block from Markdown.
 * Returns empty string if fewer than 2 headings are found.
 */
function buildTocHtml(markdown: string): string {
  const entries = extractToc(markdown);
  if (entries.length < 2) return '';

  const minLevel = Math.min(...entries.map(e => e.level));

  let tocItems = '<ul>';
  let openLists = 0;

  for (const entry of entries) {
    const depth = entry.level - minLevel;
    while (openLists < depth) {
      tocItems += '<ul>';
      openLists++;
    }
    while (openLists > depth) {
      tocItems += '</ul>';
      openLists--;
    }
    tocItems += `<li><a href="#${escapeHtml(entry.id)}">${escapeHtml(entry.text)}</a></li>`;
  }
  while (openLists > 0) {
    tocItems += '</ul>';
    openLists--;
  }
  tocItems += '</ul>';

  return `<nav class="toc"><details open><summary>Table of Contents</summary>${tocItems}</details></nav>\n`;
}

/**
 * Generate a complete, self-contained HTML document from Markdown.
 * Includes CSP meta tag, inline styles, and TOC for offline viewing.
 */
export async function generateHtmlDocument(
  markdown: string,
  options: HtmlExportOptions = {},
): Promise<string> {
  const bodyHtml = await markdownToHtml(markdown);
  const title = options.title ?? extractTitle(bodyHtml);
  const customCss = options.css ? `\n${options.css.replace(/<\/style\s*>/gi, '/* </style> removed */')}` : '';
  const tocHtml = buildTocHtml(markdown);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: https:; connect-src 'none'">
<title>${escapeHtml(title)}</title>
<style>${DEFAULT_CSS}${customCss}</style>
<style>${katexCss}</style>
<style>${highlightCss}</style>
</head>
<body>
${tocHtml}${bodyHtml}
</body>
</html>`;
}

// ── EPUB export ────────────────────────────────────────────────────────────

interface EpubOptions {
  title?: string;
  author?: string;
  language?: string;
  publisher?: string;
  description?: string;
  coverImage?: string;
}

/**
 * Generate an EPUB e-book file from Markdown via epub-gen-memory.
 * Returns the EPUB as a Uint8Array so the caller can write it to disk.
 */
export async function generateEpub(
  markdown: string,
  options?: EpubOptions,
): Promise<Uint8Array> {
  const { default: epub } = await import('epub-gen-memory');
  const metadata = extractEpubMetadata(markdown, options);
  const htmlContent = await markdownToHtmlForEpub(markdown);

  const buffer = await epub(
    {
      title: metadata.title,
      author: metadata.author,
      lang: metadata.language,
      publisher: metadata.publisher,
      description: metadata.description,
      cover: metadata.coverImage,
    },
    [{ title: metadata.title, content: `<div class="epub-chapter">${htmlContent}</div>` }],
  );

  return new Uint8Array(buffer);
}

/** Extract EPUB metadata from markdown frontmatter or headings */
function extractEpubMetadata(
  markdown: string,
  options?: EpubOptions,
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

  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const frontmatter: Record<string, string> = {};
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

  const h1Match = markdown.match(/^#\s+(.+)$/m);
  const firstH1 = h1Match ? h1Match[1].trim() : 'Untitled Document';
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

/** Convert markdown to HTML body for EPUB content */
async function markdownToHtmlForEpub(markdown: string): Promise<string> {
  const stripped = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  return markdownToHtml(stripped);
}
