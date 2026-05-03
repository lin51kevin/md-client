/**
 * png-bridge — registration bridge for the PNG export plugin.
 *
 * Core code calls getPngExporter() / isPngExportAvailable().
 * The marklite-png-export plugin registers itself via registerPngExporter().
 */

let pngExporter: ((previewEl: HTMLElement) => Promise<void>) | null = null;

export function registerPngExporter(fn: (previewEl: HTMLElement) => Promise<void>): void {
  pngExporter = fn;
}

export function unregisterPngExporter(): void {
  pngExporter = null;
}

export function getPngExporter(): ((previewEl: HTMLElement) => Promise<void>) | null {
  return pngExporter;
}

export function isPngExportAvailable(): boolean {
  return pngExporter !== null;
}
