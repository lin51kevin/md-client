import { open, save, message, ask } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { Tab } from '../types';
import type { TranslationKey } from '../i18n/zh-CN';
import { markSelfSave } from './useFileWatcher';
import { toErrorMessage } from '../lib/utils/errors';
import { useExportOps } from './useExportOps';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface FileOpsParams {
  getActiveTab: () => Tab;
  tabs: Tab[];
  openFileInTab: (path: string) => Promise<void>;
  markSaved: (id: string) => void;
  markSavedAs: (id: string, filePath: string) => void;
  t?: TFn;
  /** 首次保存（Save As）完成后的回调，用于转存待处理图片 */
  onFirstSave?: (tabId: string, savedPath: string) => Promise<void>;
}

export function useFileOps({ getActiveTab, tabs, openFileInTab, markSaved, markSavedAs, t, onFirstSave }: FileOpsParams) {
  const tr = t ?? ((k: string) => k);

  // ── Export operations (separate concern) ──────────────────────────
  const exportOps = useExportOps({ getActiveTab, t });

  // ── File open ─────────────────────────────────────────────────────
  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      });
      const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
      const LARGE_FILE_WARN = 5 * 1024 * 1024; // 5 MB
      for (const p of paths) {
        try {
          const fileSize = await invoke<number>('get_file_size', { path: p });
          if (fileSize > LARGE_FILE_WARN) {
            const sizeMB = Math.round(fileSize / 1024 / 1024);
            const proceed = await ask(
              tr('fileOps.largeFileWarning', { size: sizeMB }),
              { title: tr('fileOps.hint'), kind: 'warning' }
            );
            if (!proceed) return;
          }
        } catch { /* get_file_size not available, proceed */ }
        await openFileInTab(p);
      }
    } catch (err) {
      const errMsg = toErrorMessage(err);
      if (errMsg !== 'Cancelled' && errMsg !== '') {
        console.warn(`[useFileOps] openFile cancelled/error: ${errMsg}`);
      }
    }
  };

  // ── Save As ───────────────────────────────────────────────────────
  const handleSaveAsFile = async (tabId?: string) => {
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (!tab) return;
    try {
      const savePath = await save({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (savePath) {
        await invoke('write_file_text', { path: savePath, content: tab.doc });
        const wasUnsaved = !tab.filePath;
        markSavedAs(tab.id, savePath);
        markSelfSave(savePath);
        if (wasUnsaved && onFirstSave) {
          await onFirstSave(tab.id, savePath);
        }
      }
    } catch (err) {
      const errMsg = toErrorMessage(err);
      await message(errMsg, { title: tr('fileOps.saveAsFailed'), kind: 'error' });
    }
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSaveFile = async (tabId?: string) => {
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (!tab) return;
    try {
      if (tab.filePath) {
        await invoke('write_file_text', { path: tab.filePath, content: tab.doc });
        markSaved(tab.id);
        markSelfSave(tab.filePath);
      } else {
        await handleSaveAsFile(tab.id);
      }
    } catch (err) {
      const errMsg = toErrorMessage(err);
      await message(errMsg, { title: tr('fileOps.saveFailed'), kind: 'error' });
    }
  };

  return {
    handleOpenFile,
    handleSaveFile,
    handleSaveAsFile,
    ...exportOps,
  };
}
