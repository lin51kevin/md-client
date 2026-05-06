/**
 * PDF-specific HTML generator.
 *
 * Generates a self-contained HTML document optimized for PDF printing via
 * the WebView2 PrintToPdf API. Includes @page CSS rules, proper margins,
 * page headers/footers, and all content inline (images as data URIs).
 */

import { markdownToHtml } from '../markdown/html-export';
import { getKatexCSSString } from '../markdown/katex-bridge';
import { escapeHtml } from '../utils/html-safety';
import highlightCss from 'highlight.js/styles/github.css?raw';

/**
 * Extract document title from markdown (frontmatter title or first H1).
 */
function extractDocTitle(markdown: string): string {
  // Try frontmatter title
  if (markdown.startsWith('---')) {
    const endIdx = markdown.indexOf('\n---\n', 4);
    if (endIdx > 0) {
      const frontmatter = markdown.slice(4, endIdx);
      for (const line of frontmatter.split('\n')) {
        if (line.trim().startsWith('title:')) {
          const val = line.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
          if (val) return val;
        }
      }
    }
  }
  // Try first H1
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return 'Document';
}

// ── Print-specific CSS ─────────────────────────────────────────────────────

const PRINT_CSS = `
/* Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
  background: #fff;
}

/* Page layout */
@page {
  size: A4;
  margin: 20mm 18mm 25mm 18mm;
}

/* Avoid page breaks inside elements */
h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
pre, blockquote, table, figure, img { page-break-inside: avoid; break-inside: avoid; }
p { orphans: 3; widows: 3; }

/* Headings */
h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; line-height: 1.3; font-weight: 600; }
h1 { font-size: 1.8em; border-bottom: 2px solid #333; padding-bottom: 0.3em; margin-top: 0; }
h2 { font-size: 1.4em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }
h3 { font-size: 1.2em; }
h4 { font-size: 1.05em; }
h5 { font-size: 1em; }
h6 { font-size: 0.95em; color: #555; }

/* Paragraphs & inline */
p { margin-bottom: 0.8em; }
a { color: #0366d6; text-decoration: none; }
a::after { content: " (" attr(href) ")"; font-size: 0.8em; color: #666; }
a[href^="#"]::after { content: ""; }

/* Code */
code {
  font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
  font-size: 0.85em;
  background: #f5f5f5;
  padding: 0.15em 0.35em;
  border-radius: 3px;
  border: 1px solid #e8e8e8;
}
pre {
  background: #f8f9fa;
  border: 1px solid #d1d5da;
  border-radius: 4px;
  padding: 0.8em 1em;
  overflow-x: visible;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  margin-bottom: 1em;
  font-size: 0.85em;
  line-height: 1.5;
}
pre code {
  background: none;
  padding: 0;
  border: none;
  font-size: inherit;
}

/* Blockquote */
blockquote {
  border-left: 4px solid #ddd;
  color: #555;
  padding: 0.5em 1em;
  margin: 0 0 1em 0;
  background: #fafafa;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
  font-size: 0.9em;
}
th, td {
  border: 1px solid #d1d5da;
  padding: 0.4em 0.6em;
  text-align: left;
}
th {
  background: #f0f0f0;
  font-weight: 600;
}
tr:nth-child(even) td { background: #fafafa; }

/* Images */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.5em auto;
}

/* Horizontal rule */
hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }

/* Lists */
ul, ol { padding-left: 1.8em; margin-bottom: 0.8em; }
li { margin-bottom: 0.2em; }
input[type="checkbox"] { margin-right: 0.4em; }

/* Task list */
li input[type="checkbox"] { vertical-align: middle; }

/* TOC */
nav.toc {
  background: #f8f9fa;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 0.8em 1.2em;
  margin-bottom: 1.5em;
  page-break-inside: avoid;
}
nav.toc summary { font-weight: 600; font-size: 1.05em; cursor: pointer; }
nav.toc ul { list-style: none; padding-left: 0; margin: 0.5em 0 0 0; }
nav.toc ul ul { padding-left: 1.2em; }
nav.toc li { margin-bottom: 0.15em; font-size: 0.9em; }
nav.toc a { color: #333; text-decoration: none; }
nav.toc a::after { content: ""; }

/* KaTeX overrides for print */
.katex { font-size: 1em !important; }
.katex-display { margin: 0.8em 0 !important; overflow-x: visible !important; }

/* Mermaid diagrams */
.mermaid svg { max-width: 100%; height: auto; }
`;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a complete, self-contained HTML document optimized for PDF printing.
 * The generated HTML is designed to be loaded in a WebView and printed to PDF
 * via the WebView2 PrintToPdf API.
 */
export async function generatePdfHtml(markdown: string): Promise<string> {
  const bodyHtml = await markdownToHtml(markdown);
  const title = extractDocTitle(markdown);

  // KaTeX CSS
  let katexCss = '';
  try {
    katexCss = getKatexCSSString() || '';
  } catch {
    // KaTeX not available
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>${PRINT_CSS}</style>
<style>${katexCss}</style>
<style>${highlightCss}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
