/**
 * Pre-render mermaid diagrams to PNG before handing off to the Rust export pipeline.
 * Rust (genpdf / docx-rs) cannot render mermaid or KaTeX natively, so we rasterise
 * them in the browser and pass the PNG blobs as base64 alongside the raw markdown.
 */

import { initMermaid } from './mermaid';

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

  return assets;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract the body of all fenced code blocks with the given language tag. */
function extractFencedBlocks(markdown: string, lang: string): string[] {
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
    // Use a unique ID that won't conflict with anything in the live DOM
    const id = `export-mermaid-${index}-${Date.now()}`;
    const { svg } = await mermaid.render(id, definition.trim());

    const dims = getSvgDimensions(svg);
    // Render at 2× for sharper output when printed
    const scale = 2;
    const w = Math.max(dims.width * scale, 100);
    const h = Math.max(dims.height * scale, 50);

    const data = await svgToPngBase64(svg, w, h);
    if (!data) return null;

    return { data, width: w, height: h };
  } catch (e) {
    console.warn(`export-prerender: mermaid block ${index} failed:`, e);
    return null;
  }
}

function getSvgDimensions(svg: string): { width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.documentElement;

  const viewBox = svgEl.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: Math.ceil(parts[2]), height: Math.ceil(parts[3]) };
    }
  }

  const w = parseFloat(svgEl.getAttribute('width') ?? '0');
  const h = parseFloat(svgEl.getAttribute('height') ?? '0');
  return { width: Math.ceil(w) || 800, height: Math.ceil(h) || 400 };
}

function svgToPngBase64(svg: string, width: number, height: number): Promise<string | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(null);

    // White background so transparent SVGs look clean on paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/png');
      // Strip the "data:image/png;base64," prefix
      resolve(dataUrl.split(',')[1] ?? null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
