/**
 * useAppLayout — aggregates layout-related state for AppShell.
 *
 * Consolidates:
 *   - Editor view mode + split sizes (EditorStore)
 *   - Sidebar panel state (useSidebarPanel)
 *   - File tree root (local, persisted via useSidebarPanel's backing store)
 */
import { useState } from 'react';
import { useEditorStore } from '../stores';
import { useSidebarPanel } from './useSidebarPanel';
import { StorageKeys } from '../lib/storage';

export function useAppLayout() {
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const splitSizes = useEditorStore((s) => s.splitSizes);
  const setSplitSizes = useEditorStore((s) => s.setSplitSizes);

  const sidebarPanel = useSidebarPanel();

  const [fileTreeRoot, setFileTreeRoot] = useState<string>(() => {
    try { return localStorage.getItem(StorageKeys.FILETREE_ROOT) || ''; } catch { return ''; }
  });

  return {
    viewMode, setViewMode,
    splitSizes, setSplitSizes,
    fileTreeRoot, setFileTreeRoot,
    ...sidebarPanel,
  };
}
