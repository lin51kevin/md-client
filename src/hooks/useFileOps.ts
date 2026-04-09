import { open, save, message } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { generateHtmlDocument } from '../lib/html-export';
import { Tab } from '../types';

interface FileOpsParams {
  getActiveTab: () => Tab;
  tabs: Tab[];
  openFileInTab: (path: string) => Promise<void>;
  markSaved: (id: string) => void;
  markSavedAs: (id: string, filePath: string) => void;
}

export function useFileOps({ getActiveTab, tabs, openFileInTab, markSaved, markSavedAs }: FileOpsParams) {
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
    } catch (err) {
      console.error('Failed to open file', err);
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
      await message(errMsg, { title: '另存为失败', kind: 'error' });
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
      await message(errMsg, { title: '保存失败', kind: 'error' });
    }
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'html') => {
    const tab = getActiveTab();
    if (!tab) return;
    
    if (!tab.doc.trim()) {
      await message('文档内容为空，无法导出。', { title: '提示', kind: 'warning' });
      return;
    }

    // HTML 导出走前端生成，无需 Rust 后端
    if (format === 'html') {
      const savePath = await save({
        filters: [{ name: 'HTML Document', extensions: ['html'] }],
      });
      if (savePath) {
        const html = await generateHtmlDocument(tab.doc);
        await invoke('write_file_text', { path: savePath, content: html });
      }
      return;
    }

    const filterName = format === 'docx' ? 'Word Document' : 'PDF Document';
    try {
      const savePath = await save({
        filters: [{ name: filterName, extensions: [format] }],
      });
      if (savePath) {
        await invoke('export_document', { markdown: tab.doc, outputPath: savePath, format });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await message(errMsg, { title: `导出 ${format.toUpperCase()} 失败`, kind: 'error' });
    }
  };

  const handleExportDocx = () => handleExport('docx');
  const handleExportPdf = () => handleExport('pdf');
  const handleExportHtml = () => handleExport('html');

  return { handleOpenFile, handleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml };
}
