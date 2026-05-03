// Markdown utilities — explicit named exports for clear API surface and tree-shaking.
// Modules consumed only via direct imports (extensions, pipeline, html-import,
// remark-wikilinks) are intentionally omitted from this barrel.

// ── Table of Contents ────────────────────────────────────────────────────────
export { extractToc, slugify, type TocEntry } from './toc';
// ── Mermaid Diagrams ─────────────────────────────────────────────────────────
export { initMermaid, renderMermaid, resetMermaidInit, clearMermaidSvgCache, getCurrentThemeConfig } from './mermaid';
export { isMermaidAvailable, getMermaidRenderer, type MermaidRenderer } from './mermaid-bridge';
// ── Table Parser ─────────────────────────────────────────────────────────────
export { parseTable, serializeTable, type TableData, type Alignment } from './table-parser';
// ── Mindmap Converter ────────────────────────────────────────────────────────
export { tocToMindmap, sanitizeText } from './mindmap-converter';
// ── LaTeX Rendering ──────────────────────────────────────────────────────────
export { renderLatex } from './latex';
// ── HTML Export ──────────────────────────────────────────────────────────────
export { markdownToHtml, generateHtmlDocument, generateEpub, type HtmlExportOptions } from './html-export';
// ── Export Pre-rendering ─────────────────────────────────────────────────────
export { extractFencedBlocks, extractLatexFormulas, prerenderExportAssets, type PreRenderedAsset, type PreRenderedAssets } from './export-prerender';
// ── Transclusion ─────────────────────────────────────────────────────────────
export { resolveTransclusions, transclusionToPlaceholders, parseTransclusionMarker } from './transclusion';
