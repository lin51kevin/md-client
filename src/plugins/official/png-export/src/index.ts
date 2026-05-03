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

export async function activate(_context: PluginContext) {
  const exportFn = async (previewEl: HTMLElement) => {
    const canvas = await (await import('html2canvas')).default(previewEl, {
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
    deactivate: () => unregisterPngExporter(),
  };
}
