/**
 * html2canvas-bridge — decouples html2canvas from the core export pipeline.
 *
 * The marklite-png-export plugin (or any plugin that bundles html2canvas)
 * calls registerHtml2Canvas() during activation.  export-prerender queries
 * getHtml2Canvas() at render time and falls back gracefully when unavailable.
 */

type Html2CanvasFn = (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;

let html2canvasFn: Html2CanvasFn | null = null;

export function registerHtml2Canvas(fn: Html2CanvasFn): void {
  html2canvasFn = fn;
}

export function unregisterHtml2Canvas(): void {
  html2canvasFn = null;
}

export function getHtml2Canvas(): Html2CanvasFn | null {
  return html2canvasFn;
}

export function isHtml2CanvasAvailable(): boolean {
  return html2canvasFn !== null;
}
