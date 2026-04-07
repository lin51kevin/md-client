import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Tab } from '../types';

export function useWindowTitle(activeTab: Tab, isTauri: boolean) {
  useEffect(() => {
    if (!isTauri) return;
    const name = activeTab.filePath
      ? (activeTab.filePath.split(/[\\/]/).pop() ?? activeTab.filePath)
      : 'Untitled.md';
    const prefix = activeTab.isDirty ? '*' : '';
    getCurrentWindow().setTitle(`${prefix}${name} - md-client`);
  }, [activeTab.filePath, activeTab.isDirty, activeTab.id, isTauri]);
}
