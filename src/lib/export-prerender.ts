/**
 * Pre-render mermaid diagrams & LaTeX formulas to PNG before handing off
 * to the Rust export pipeline.
 * Rust (genpdf / docx-rs) cannot render mermaid or KaTeX natively, so we rasterise
 * them in the browser and pass the PNG blobs as base64 alongside the raw markdown.
 */

import { initMermaid } from './mermaid';

// KaTeX CSS as raw string — inlined into self-contained SVG for formula rendering
import katexCss from 'katex/dist/katex.min.css?raw';

export interface PreRenderedAsset {
  /** Base64-encoded PNG bytes (no data-URL prefix). */
  data: string;
  /** PNG pixel width at the chosen render scale. */
  width: number;
  /** PNG pixel height at the chosen render scale. */
  height: number;
}

/** Map of stable keys → pre-rendered PNG assets.
 *  Keys follow the convention `mermaid_0`, `mermaid_1`, … matching the order
 *  of ```mermaid code blocks in the source markdown. */
export type PreRenderedAssets = Record<string, PreRenderedAsset>;

/**
 * Scans `markdown` for code blocks that need pre-rendering and returns a map
 * of base64 PNG blobs that the Rust backend can embed as images.
 */
export async function prerenderExportAssets(markdown: string): Promise<PreRenderedAssets> {
  const assets: PreRenderedAssets = {};

  const mermaidDefs = extractFencedBlocks(markdown, 'mermaid');
  for (let i = 0; i < mermaidDefs.length; i++) {
    const asset = await renderMermaidToPng(mermaidDefs[i], i);
    if (asset) {
      assets[`mermaid_${i}`] = asset;
    }
  }

  // [P0-5] Pre-render LaTeX math formulas
  const latexDefs = extractLatexFormulas(markdown);
  for (let i = 0; i < latexDefs.length; i++) {
    const asset = await renderLatexToPng(latexDefs[i].formula, latexDefs[i].display);
    if (asset) {
      assets[`latex_${i}`] = asset;
    }
  }

  return assets;
}

// ---------------------------------------------------------------------------
// Internal helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Extract the body of all fenced code blocks with the given language tag. */
export function extractFencedBlocks(markdown: string, lang: string): string[] {
  const blocks: string[] = [];
  // Match ```lang ... ``` blocks; handles CRLF and LF line endings
  const re = new RegExp(`^\`\`\`${lang}[ \\t]*\\r?\\n([\\s\\S]*?)^\`\`\``, 'gm');
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

async function renderMermaidToPng(
  definition: string,
  index: number,
): Promise<PreRenderedAsset | null> {
  try {
    const { default: mermaid } = await initMermaid();
    const id = `export-mermaid-${index}-${Date.now()}`;
    const { svg } = await mermaid.render(id, definition.trim());

    // Use html2canvas to capture the real DOM (including <foreignObject> text
    // labels) instead of the old svg→img→canvas pipeline which stripped
    // foreignObject to avoid canvas taint — losing all node/edge labels.
    return await elementToPngBase64((container) => {
      container.innerHTML = svg;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
      }
    });
  } catch (e) {
    console.warn(`export-prerender: mermaid block ${index} failed:`, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared helper: DOM element → PNG via html2canvas
// ---------------------------------------------------------------------------

/**
 * Create an off-screen DOM element, let `setup` populate it, then capture it
 * to a PNG base64 string via html2canvas.  This avoids the SVG foreignObject
 * canvas-taint issue that broke the old img→canvas pipeline for both mermaid
 * diagrams and KaTeX formulas.
 */
async function elementToPngBase64(
  setup: (container: HTMLDivElement) => void,
  scale: number = 2,
): Promise<PreRenderedAsset | null> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;background:#fff;padding:16px;z-index:-1;';
  setup(container);
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      logging: false,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const data = dataUrl.split(',')[1];
    if (!data) return null;
    return { data, width: canvas.width, height: canvas.height };
  } catch {
    return null;
  } finally {
    document.body.removeChild(container);
  }
}

// ---------------------------------------------------------------------------
// [P0-5] LaTeX formula pre-rendering (KaTeX → SVG → Canvas → PNG base64)
// ---------------------------------------------------------------------------

interface LatexDef {
  formula: string;
  display: boolean; // true = $$...$$, false = $...$
}

/** Extract all $$...$$ (display) and $...$ (inline) formulas from markdown.
 *
 * Uses a line-by-line state machine so it correctly:
 * - Skips fenced code blocks (``` or ~~~)
 * - Handles multi-line display math (standalone $$ on its own line)
 * - Handles same-line display math ($$formula$$)
 * - Handles inline math ($formula$)
 * All formulas are emitted in document order so the index matches the
 * order that pulldown-cmark emits InlineMath/DisplayMath events in Rust.
 */
// Exported for testing
// Internal helpers (exported for testing)
export function extractLatexFormulas(markdown: string): LatexDef[] {
  const defs: LatexDef[] = [];
  let inCodeBlock = false;
  let inDisplayBlock = false;
  const displayBlockLines: string[] = [];

  for (const line of markdown.split('\n')) {
    const trimmed = line.trimStart();

    // ── Fenced code block boundary (use startsWith for both open and close) ──
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // ── Multi-line display math block: $$ on its own line ──
    if (trimmed === '$$') {
      if (!inDisplayBlock) {
        inDisplayBlock = true;
        displayBlockLines.length = 0;
      } else {
        defs.push({ formula: displayBlockLines.join('\n').trim(), display: true });
        inDisplayBlock = false;
        displayBlockLines.length = 0;
      }
      continue;
    }
    if (inDisplayBlock) {
      displayBlockLines.push(line);
      continue;
    }

    // ── Same-line display math: $$formula$$ ──
    const displayRe = /\$\$([\s\S]+?)\$\$/g;
    let m: RegExpExecArray | null;
    while ((m = displayRe.exec(line)) !== null) {
      defs.push({ formula: m[1].trim(), display: true });
    }

    // ── Inline math: $formula$ (not $$) ──
    // Require at least one non-digit/non-space char after $ to avoid matching prices like $5.00
    const inlineRe = /(?<!\$)\$(?!\$)([^\d\s$][^$]*?)(?<!\$)\$(?!\$)/g;
    while ((m = inlineRe.exec(line)) !== null) {
      defs.push({ formula: m[1].trim(), display: false });
    }
  }
  return defs;
}

/** Dynamically import KaTeX and render a formula string to HTML. */
async function katexRenderToString(formula: string, display: boolean): Promise<string> {
  try {
    const katex = await import('katex');
    return katex.default.renderToString(formula, { displayMode: display, throwOnError: false });
  } catch {
    return `<span style="color:red">[LaTeX Error]</span>`;
  }
}

async function renderLatexToPng(formula: string, display: boolean): Promise<PreRenderedAsset | null> {
  try {
    const html = await katexRenderToString(formula, display);

    // html2canvas cannot render the inline <svg> paths that KaTeX uses for
    // special symbols, so we use a self-contained SVG+foreignObject approach
    // with KaTeX CSS **inlined** to avoid cross-origin taint.
    //
    // Step 1: Measure actual rendered size via an off-screen DOM element.
    const measure = document.createElement('div');
    measure.style.cssText =
      'position:fixed;left:-9999px;top:0;background:#fff;z-index:-1;' +
      `font-size:${display ? 18 : 13}px;padding:${display ? '16px 24px' : '4px 8px'};` +
      'display:inline-block;white-space:nowrap;';
    measure.innerHTML = html;
    document.body.appendChild(measure);
    await document.fonts.ready;
    const rect = measure.getBoundingClientRect();
    document.body.removeChild(measure);

    const scale = 2;
    const w = Math.max(Math.ceil(rect.width * scale), 40);
    const h = Math.max(Math.ceil(rect.height * scale), 20);

    // Step 2: Build self-contained SVG with inlined KaTeX CSS.
    const svgXml = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <foreignObject x="0" y="0" width="${w}" height="${h}">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:${(display ? 18 : 13) * scale}px;padding:${display ? `${16 * scale}px ${24 * scale}px` : `${4 * scale}px ${8 * scale}px`};transform-origin:top left;">
      <style>${katexCss}</style>
      ${html}
    </div>
  </foreignObject>
</svg>`;

    const data = await svgToCanvasPng(svgXml, w, h);
    if (!data) return null;
    return { data, width: w, height: h };
  } catch (e) {
    console.warn(`export-prerender: latex formula failed:`, e);
    return null;
  }
}

/**
 * Render a self-contained SVG string (with all CSS inlined) to a PNG base64
 * string via canvas.  Because external references are inlined, the canvas is
 * NOT tainted and `toDataURL()` succeeds.
 */
function svgToCanvasPng(svgXml: string, width: number, height: number): Promise<string | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(null);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 10_000);

    img.onload = () => {
      clearTimeout(timeoutId);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl.split(',')[1] ?? null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
