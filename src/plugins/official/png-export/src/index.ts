/**
 * marklite-png-export — official plugin that provides PNG export functionality.
 *
 * Migrated from useExportOps.ts handleExportPng().
 * Uses html2canvas to capture the preview element.
 */
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { PluginContext } from '../../../plugin-sandbox';
import { registerPngExporter, unregisterPngExporter } from '../../../../lib/export/png-bridge';
import { registerHtml2Canvas, unregisterHtml2Canvas } from '../../../../lib/export/html2canvas-bridge';

export async function activate(_context: PluginContext) {
  // Register html2canvas bridge for core export-prerender pipeline
  const { default: html2canvas } = await import('html2canvas');
  registerHtml2Canvas(html2canvas as (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>);

  const exportFn = async (previewEl: HTMLElement) => {
    const canvas = await html2canvas(previewEl, {
      backgroundColor: getComputedStyle(previewEl).backgroundColor || '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const savePath = await save({
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
      defaultPath: 'untitled.png',
    });

    if (savePath) {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png'),
      );
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await invoke('write_image_bytes', { path: savePath, data: Array.from(bytes) });
    }
  };

  registerPngExporter(exportFn);

  return {
    deactivate: () => {
      unregisterPngExporter();
      unregisterHtml2Canvas();
    },
  };
}
