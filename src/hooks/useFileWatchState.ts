/**
 * useFileWatchState — orchestrates file-watcher events and reload logic.
 *
 * Owns fileChangeToast state and handleReloadFile, encapsulating the
 * interaction between useFileWatcher callbacks, auto-reload preference,
 * and tab state mutations. Extracted from App.tsx to reduce inline logic.
 */
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Tab } from '../types';
import { useFileWatcher } from './useFileWatcher';

interface FileWatchStateParams {
  tabs: Tab[];
  enabled: boolean;
  /** autoReload kept for backward compat; clean tabs always reload silently */
  autoReload: boolean;
  updateTab: (tabId: string, patch: Partial<Tab>) => void;
}

export interface FileChangeToast {
  type: 'modified' | 'deleted';
  tabId: string;
  filePath: string;
}

export function useFileWatchState({ tabs, enabled, autoReload: _autoReload, updateTab }: FileWatchStateParams) {
  const [fileChangeToast, setFileChangeToast] = useState<FileChangeToast | null>(null);

  const handleReloadFile = useCallback(async (tabId: string, filePath: string) => {
    try {
      const content = await invoke<string>('read_file_text', { path: filePath });
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        updateTab(tabId, { doc: content, isDirty: false });
      }
    } catch (err) {
      console.warn('[useFileWatchState] reload failed:', err);
    }
  }, [tabs, updateTab]);

  useFileWatcher({
    tabs,
    enabled,
    onFileChanged: (tabId, filePath) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab?.isDirty) {
        // User has unsaved edits — always show toast to avoid data loss
        setFileChangeToast({ type: 'modified', tabId, filePath });
      } else {
        // Tab is clean (no unsaved edits) — silently reload
        void handleReloadFile(tabId, filePath);
      }
    },
    onFileDeleted: (tabId, filePath) => {
      setFileChangeToast({ type: 'deleted', tabId, filePath });
    },
  });

  return { fileChangeToast, setFileChangeToast, handleReloadFile };
}
