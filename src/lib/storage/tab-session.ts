/**
 * tab-session.ts — Pure functions for tab session persistence.
 *
 * Handles serialization/deserialization of the open-tab list to localStorage,
 * keeping IO concerns out of the useTabs hook.
 */
import { invoke } from '@tauri-apps/api/core';
import type { Tab } from '../../types';
import { StorageKeys } from './storage-keys';

const SESSION_KEY = StorageKeys.SESSION_TABS;

/** The shape written to / read from localStorage */
interface SerializedTab {
  id: string;
  filePath: string | null;
  displayName?: string;
  isPinned?: boolean;
}

interface SerializedSession {
  tabs: SerializedTab[];
  activeTabId: string;
}

export interface RestoredSession {
  tabs: Tab[];
  activeTabId: string;
}

/**
 * Read the persisted session from localStorage and load file contents from disk.
 * Returns `null` when there is no valid session to restore.
 */
/**
 * Batch-read file contents for session restore via a single IPC call.
 * Returns a Map from file path to content string.
 * Files that fail to read map to an empty string.
 */
async function batchReadFiles(paths: string[]): Promise<Map<string, string>> {
  const results = await invoke<[string, string][]>('restore_session_files', { paths });
  return new Map(results);
}

export async function restoreSession(): Promise<RestoredSession | null> {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return null;

    const session: SerializedSession = JSON.parse(saved);
    if (!session.tabs || session.tabs.length === 0) return null;

    // Collect valid file paths for batch read
    const tabsWithFiles = session.tabs.filter(t => t.filePath);
    if (tabsWithFiles.length === 0) return null;

    const paths = tabsWithFiles.map(t => t.filePath!);
    const contents = await batchReadFiles(paths);

    const restoredTabs: Tab[] = [];
    for (const serialized of tabsWithFiles) {
      const content = contents.get(serialized.filePath!);
      // Skip files whose content is empty (read failure) or not a string
      if (!content || typeof content !== 'string') continue;
      restoredTabs.push({
        id: serialized.id,
        filePath: serialized.filePath!,
        doc: content,
        isDirty: false,
        displayName: serialized.displayName,
        isPinned: serialized.isPinned,
      });
    }

    if (restoredTabs.length === 0) return null;

    const activeExists = restoredTabs.some(t => t.id === session.activeTabId);
    return {
      tabs: restoredTabs,
      activeTabId: activeExists ? session.activeTabId : restoredTabs[0].id,
    };
  } catch {
    return null;
  }
}

/**
 * Persist the current tab list and active tab to localStorage.
 * Only tabs with a real file path are saved — untitled tabs are always transient.
 * Clears the entry if no tabs have a file path.
 */
export function persistSession(tabs: Tab[], activeTabId: string): void {
  const tabsToSave = tabs.filter(t => t.filePath !== null);
  if (tabsToSave.length === 0) {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    return;
  }

  const session: SerializedSession = {
    tabs: tabsToSave.map(t => ({
      id: t.id,
      filePath: t.filePath,
      displayName: t.displayName,
      isPinned: t.isPinned,
    })),
    activeTabId,
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* Silently ignore quota or privacy errors */
  }
}
