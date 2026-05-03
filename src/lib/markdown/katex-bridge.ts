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
};

let katexPlugin: KatexPlugin | null = null;
let cssLoaded = false;

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
 * Ensure KaTeX CSS is injected into the DOM exactly once.
 * Called by the marklite-katex plugin during activation.
 */
export async function ensureKatexCSS(): Promise<void> {
  if (cssLoaded) return;
  await import('katex/dist/katex.min.css');
  cssLoaded = true;
}
