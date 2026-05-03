/**
 * KaTeX Bridge — decouples KaTeX rendering from the core markdown pipeline.
 *
 * Official plugin `marklite-katex` calls `registerKatexPlugin()` during
 * activation.  The pipeline queries `getKatexPlugin()` at render time and
 * conditionally includes remark-math + rehype-katex only when available.
 */

export type KatexPlugin = {
  remarkMath: unknown;
  rehypeKatex: unknown;
  /** Render a formula to an HTML string (used by export-prerender). */
  renderToString?: (formula: string, opts: { displayMode: boolean; throwOnError: boolean }) => string;
  /** Return KaTeX CSS as a raw string (used by export-prerender for SVG inlining). */
  getCSSString?: () => string;
};

let katexPlugin: KatexPlugin | null = null;

export function registerKatexPlugin(plugin: KatexPlugin): void {
  katexPlugin = plugin;
}

export function unregisterKatexPlugin(): void {
  katexPlugin = null;
}

export function getKatexPlugin(): KatexPlugin | null {
  return katexPlugin;
}

export function isKatexAvailable(): boolean {
  return katexPlugin !== null;
}

/**
 * Render a LaTeX formula to HTML via the registered KaTeX plugin.
 * Returns null if katex plugin is not active.
 */
export function katexRenderToString(
  formula: string,
  display: boolean,
): string | null {
  if (!katexPlugin?.renderToString) return null;
  return katexPlugin.renderToString(formula, { displayMode: display, throwOnError: false });
}

/**
 * Get KaTeX CSS as a raw string for inlining into SVG foreignObject.
 * Returns null if katex plugin is not active.
 */
export function getKatexCSSString(): string | null {
  if (!katexPlugin?.getCSSString) return null;
  return katexPlugin.getCSSString();
}

/**
 * Ensure KaTeX CSS is injected into the DOM exactly once.
 * Called by the marklite-katex plugin during activation.
 */
export function ensureKatexCSS(): void {
  // CSS injection is now handled by the plugin itself — this is a no-op
  // retained for backward compatibility.
}
