import { useState, useEffect, useCallback } from 'react';
import { getSnapshots, createSnapshot as createVersionSnapshot, type Snapshot } from '../lib/version-history';
import type { Tab } from '../types';

interface UseVersionHistoryOptions {
  rawHandleSaveFile: (tabId?: string) => Promise<void>;
  getActiveTab: () => Tab;
  tabs: Tab[];
  activeFilePath: string | null;
}

export type { Snapshot };

export function useVersionHistory({ rawHandleSaveFile, getActiveTab, tabs, activeFilePath }: UseVersionHistoryOptions) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  // Load snapshots when the active file changes
  useEffect(() => {
    if (activeFilePath) {
      setSnapshots(getSnapshots(activeFilePath));
    } else {
      setSnapshots([]);
    }
  }, [activeFilePath]);

  // Wrapped save: writes to disk AND creates a version snapshot (manual Ctrl+S only)
  const handleSaveFile = useCallback(async (tabId?: string) => {
    await rawHandleSaveFile(tabId);
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (tab?.filePath) {
      const updated = createVersionSnapshot(tab.filePath, tab.doc);
      setSnapshots(updated);
    }
  }, [rawHandleSaveFile, tabs, getActiveTab]);

  return { snapshots, handleSaveFile };
}
