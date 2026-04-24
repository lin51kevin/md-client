/**
 * useFileWatchState — orchestrates file-watcher events and reload logic.
 *
 * Owns fileChangeToast state and handleReloadFile, encapsulating the
 * interaction between useFileWatcher callbacks, auto-reload preference,
 * and tab state mutations. Extracted from App.tsx to reduce inline logic.
 */
import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Tab } from '../types';
import { useFileWatcher } from './useFileWatcher';
import { computeHash, setFileHash } from './useFileHash';

interface FileWatchStateParams {
  tabs: Tab[];
  enabled: boolean;
  /** True = auto-reload clean tabs silently; False = always show toast */
  autoReload: boolean;
  updateTab: (tabId: string, patch: Partial<Tab>) => void;
}

export interface FileChangeToast {
  type: 'modified' | 'deleted';
  tabId: string;
  filePath: string;
}

export function useFileWatchState({ tabs, enabled, autoReload, updateTab }: FileWatchStateParams) {
  const [fileChangeToast, setFileChangeToast] = useState<FileChangeToast | null>(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const handleReloadFile = useCallback(async (tabId: string, filePath: string) => {
    try {
      const content = await invoke<string>('read_file_text', { path: filePath });
      const tab = tabsRef.current.find(t => t.id === tabId);
      if (tab) {
        updateTab(tabId, { doc: content, isDirty: false, externalModified: false });
        // Update hash after reload so subsequent saves compare against fresh disk state
        void computeHash(content).then(h => setFileHash(filePath, h));
      }
    } catch (err) {
      console.warn('[useFileWatchState] reload failed:', err);
    }
  }, [updateTab]);

  /**
   * User chose "Keep" — dismiss toast but mark the tab so that a
   * subsequent save triggers a confirmation dialog.
   */
  const handleKeepFile = useCallback((tabId: string) => {
    updateTab(tabId, { externalModified: true });
    setFileChangeToast(null);
  }, [updateTab]);

  useFileWatcher({
    tabs,
    enabled,
    onFileChanged: (tabId, filePath) => {
      if (autoReload) {
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.isDirty) {
          // User has unsaved edits — show persistent toast
          setFileChangeToast({ type: 'modified', tabId, filePath });
        } else {
          // Tab is clean — silently reload
          void handleReloadFile(tabId, filePath);
        }
      } else {
        setFileChangeToast({ type: 'modified', tabId, filePath });
      }
    },
    onFileDeleted: (tabId, filePath) => {
      setFileChangeToast({ type: 'deleted', tabId, filePath });
    },
  });

  return { fileChangeToast, setFileChangeToast, handleReloadFile, handleKeepFile };
}
