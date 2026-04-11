import { open, save, message } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { Tab } from '../types';
import type { TranslationKey } from '../i18n/zh-CN';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface FileOpsParams {
  getActiveTab: () => Tab;
  tabs: Tab[];
  openFileInTab: (path: string) => Promise<void>;
  markSaved: (id: string) => void;
  markSavedAs: (id: string, filePath: string) => void;
  t?: TFn;
}

export function useFileOps({ getActiveTab, tabs, openFileInTab, markSaved, markSavedAs, t }: FileOpsParams) {
  const tr = t ?? ((k: string) => k);

  /** Generate a default filename from the active tab (uses file name or first heading) */
  const getDefaultFileName = (ext: string): string => {
    const tab = getActiveTab();
    if (!tab) return `untitled.${ext}`;
    // If tab has a file path, derive from that
    if (tab.filePath) {
      const parts = tab.filePath.replace(/\\/g, '/').split('/');
      const base = parts[parts.length - 1].replace(/\.(md|markdown|txt)$/i, '');
      return `${base}.${ext}`;
    }
    // Try to extract first heading
    const h1Match = tab.doc.match(/^#\s+(.+)$/m);
    const name = h1Match ? h1Match[1].trim().replace(/[:\\/*?"<>|]/g, '').slice(0, 80) : 'untitled';
    return `${name || 'untitled'}.${ext}`;
  };
  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      });
      const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
      for (const p of paths) {
        await openFileInTab(p);
      }
    } catch {
      // ignore: dialog cancellation or file read error — no user-visible action needed
    }
  };

  const handleSaveAsFile = async (tabId?: string) => {
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (!tab) return;
    try {
      const savePath = await save({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (savePath) {
        await invoke('write_file_text', { path: savePath, content: tab.doc });
        markSavedAs(tab.id, savePath);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await message(errMsg, { title: tr('fileOps.saveAsFailed'), kind: 'error' });
    }
  };

  const handleSaveFile = async (tabId?: string) => {
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (!tab) return;
    try {
      if (tab.filePath) {
        await invoke('write_file_text', { path: tab.filePath, content: tab.doc });
        markSaved(tab.id);
      } else {
        await handleSaveAsFile(tab.id);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await message(errMsg, { title: tr('fileOps.saveFailed'), kind: 'error' });
    }
  };

  // [P1-6] Export progress log
  const handleExport = async (format: 'docx' | 'pdf' | 'html') => {
    console.log(`[export] Starting ${format.toUpperCase()} export...`);
    const tab = getActiveTab();
    if (!tab) return;
    
    if (!tab.doc.trim()) {
      await message(tr('fileOps.emptyDocExport'), { title: tr('fileOps.hint'), kind: 'warning' });
      return;
    }

    // HTML 导出走前端生成，无需 Rust 后端
    if (format === 'html') {
      const savePath = await save({
        filters: [{ name: 'HTML Document', extensions: ['html'] }],
        defaultPath: getDefaultFileName('html'),
      });
      if (savePath) {
        const { generateHtmlDocument } = await import('../lib/html-export');
        const html = await generateHtmlDocument(tab.doc);
        await invoke('write_file_text', { path: savePath, content: html });
      }
      return;
    }

    const filterName = format === 'docx' ? 'Word Document' : 'PDF Document';
    try {
      const savePath = await save({
        filters: [{ name: filterName, extensions: [format] }],
        defaultPath: getDefaultFileName(format),
      });
      if (savePath) {
        const { prerenderExportAssets } = await import('../lib/export-prerender');
        const preRenderedImages = await prerenderExportAssets(tab.doc);
        await invoke('export_document', { markdown: tab.doc, outputPath: savePath, format, preRenderedImages });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await message(errMsg, { title: tr('fileOps.exportFailed', { format: format.toUpperCase() }), kind: 'error' });
    }
  };

  const handleExportDocx = () => handleExport('docx');
  const handleExportPdf = () => handleExport('pdf');
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
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(previewEl, {
        backgroundColor: getComputedStyle(previewEl).backgroundColor || '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const savePath = await save({
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
        defaultPath: getDefaultFileName('png'),
      });
      if (savePath) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob returned null')), 'image/png'));
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        await invoke('write_image_bytes', { path: savePath, data: Array.from(bytes) });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await message(errMsg, { title: tr('fileOps.exportPngFailed'), kind: 'error' });
    }
  };

  const handleExportHtml = () => handleExport('html');

  return { handleOpenFile, handleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml, handleExportPng };
}
