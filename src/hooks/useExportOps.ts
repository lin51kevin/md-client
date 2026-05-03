/**
 * useExportOps — document export operations.
 *
 * Handles all export formats: DOCX, PDF, HTML, EPUB, PNG.
 * Extracted from useFileOps to separate file I/O concerns from format conversion.
 */
import { useState } from 'react';
import { save, message } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { Tab } from '../types';
import type { TranslationKey } from '../i18n/zh-CN';
import { toErrorMessage } from '../lib/utils/errors';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface ExportOpsParams {
  getActiveTab: () => Tab;
  t?: TFn;
}

export function useExportOps({ getActiveTab, t }: ExportOpsParams) {
  const tr = t ?? ((k: string) => k);
  const [exporting, setExporting] = useState<string | null>(null);

  /** Derive a default save filename from the active tab title or first heading */
  const getDefaultFileName = (ext: string): string => {
    const tab = getActiveTab();
    if (!tab) return `untitled.${ext}`;
    if (tab.filePath) {
      const parts = tab.filePath.replace(/\\/g, '/').split('/');
      const base = parts[parts.length - 1].replace(/\.(md|markdown|txt)$/i, '');
      return `${base}.${ext}`;
    }
    const h1Match = tab.doc.match(/^#\s+(.+)$/m);
    const name = h1Match ? h1Match[1].trim().replace(/[:\\/*?"<>|]/g, '').slice(0, 80) : 'untitled';
    return `${name || 'untitled'}.${ext}`;
  };

  const handleExport = async (
    format: 'docx' | 'pdf' | 'html' | 'epub',
    onProgress?: (stage: string, progress: number) => void
  ) => {
    const tab = getActiveTab();
    if (!tab) return;

    if (!tab.doc.trim()) {
      await message(tr('fileOps.emptyDocExport'), { title: tr('fileOps.hint'), kind: 'warning' });
      return;
    }

    setExporting(format);

    try {
      if (format === 'html') {
        onProgress?.('Generating HTML...', 30);
        const savePath = await save({
          filters: [{ name: 'HTML Document', extensions: ['html'] }],
          defaultPath: getDefaultFileName('html'),
        });
        if (savePath) {
          onProgress?.('Writing file...', 70);
          const { generateHtmlDocument } = await import('../lib/markdown');
          const html = await generateHtmlDocument(tab.doc);
          await invoke('write_file_text', { path: savePath, content: html });
          onProgress?.('Complete!', 100);
        }
        return;
      }

      if (format === 'epub') {
        onProgress?.('Generating EPUB...', 20);
        const savePath = await save({
          filters: [{ name: 'EPUB Document', extensions: ['epub'] }],
          defaultPath: getDefaultFileName('epub'),
        });
        if (savePath) {
          onProgress?.('Converting content...', 50);
          const { generateEpub } = await import('../lib/markdown');
          const epubData = await generateEpub(tab.doc);
          await invoke('write_image_bytes', { path: savePath, data: Array.from(epubData) });
          onProgress?.('Complete!', 100);
        }
        return;
      }

      const filterName = format === 'docx' ? 'Word Document' : 'PDF Document';
      const savePath = await save({
        filters: [{ name: filterName, extensions: [format] }],
        defaultPath: getDefaultFileName(format),
      });
      if (savePath) {
        onProgress?.('Pre-rendering diagrams and formulas...', 20);
        const { prerenderExportAssets } = await import('../lib/markdown');
        const preRenderedImages = await prerenderExportAssets(tab.doc);
        onProgress?.('Exporting document...', 60);
        await invoke('export_document', { markdown: tab.doc, outputPath: savePath, format, preRenderedImages });
        onProgress?.('Generating file...', 80);
        onProgress?.('Complete!', 100);
      }
    } catch (err) {
      const errMsg = toErrorMessage(err);
      await message(errMsg, { title: tr('fileOps.exportFailed', { format: format.toUpperCase() }), kind: 'error' });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPng = async (previewEl: HTMLElement | null) => {
    const tab = getActiveTab();
    if (!tab) return;
    if (!tab.doc.trim()) {
      await message(tr('fileOps.emptyDocExport'), { title: tr('fileOps.hint'), kind: 'warning' });
      return;
    }
    if (!previewEl) {
      await message(tr('fileOps.noPreviewArea'), { title: tr('fileOps.error'), kind: 'error' });
      return;
    }

    const { getPngExporter } = await import('../lib/export/png-bridge');
    const exporter = getPngExporter();
    if (!exporter) {
      await message('请安装 PNG 导出插件', { title: tr('fileOps.hint'), kind: 'warning' });
      return;
    }

    setExporting('png');

    try {
      await exporter(previewEl);
    } catch (err) {
      const errMsg = toErrorMessage(err);
      await message(errMsg, { title: tr('fileOps.exportPngFailed'), kind: 'error' });
    } finally {
      setExporting(null);
    }
  };

  return {
    exporting,
    handleExportDocx: () => handleExport('docx'),
    handleExportPdf: () => handleExport('pdf'),
    handleExportHtml: () => handleExport('html'),
    handleExportEpub: () => handleExport('epub'),
    handleExportPng,
  };
}
