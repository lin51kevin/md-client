import { open, save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
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
        await writeTextFile(savePath, tab.doc);
        markSavedAs(tab.id, savePath);
      }
    } catch (err) {
      console.error('Failed to save as file', err);
    }
  };

  const handleSaveFile = async (tabId?: string) => {
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (!tab) return;
    try {
      if (tab.filePath) {
        await writeTextFile(tab.filePath, tab.doc);
        markSaved(tab.id);
      } else {
        await handleSaveAsFile(tab.id);
      }
    } catch (err) {
      console.error('Failed to save file', err);
    }
  };

  return { handleOpenFile, handleSaveFile, handleSaveAsFile };
}
