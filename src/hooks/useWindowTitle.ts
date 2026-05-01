import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Tab } from '../types';

export function useWindowTitle(activeTab: Tab, isTauri: boolean) {
  useEffect(() => {
    if (!isTauri) return;
    const name = activeTab.filePath
      ? (activeTab.filePath.split(/[\\/]/).pop() ?? activeTab.filePath)
      : (activeTab.displayName ?? null);
    const prefix = activeTab.isDirty ? '*' : '';
    const title = name ? `${prefix}${name} - MarkLite++` : 'MarkLite++';
    getCurrentWindow().setTitle(title);
  }, [activeTab.filePath, activeTab.displayName, activeTab.isDirty, activeTab.id, isTauri]);
}
