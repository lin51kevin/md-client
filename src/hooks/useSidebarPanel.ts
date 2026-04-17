import { useCallback } from 'react';
import { useLocalStorageString } from './useLocalStorage';
import { StorageKeys } from '../lib/storage-keys';
import { PANEL_ITEMS, type PanelId } from '../components/ActivityBar';

export function useSidebarPanel() {
  const [activePanelRaw, setActivePanelRaw] = useLocalStorageString(StorageKeys.ACTIVE_PANEL, '');
  const VALID_PANELS = PANEL_ITEMS.map(item => item.id);
  // Accept built-in panel IDs or any string (plugin panel IDs)
  const activePanel: PanelId | null =
    activePanelRaw
      ? (VALID_PANELS as readonly string[]).includes(activePanelRaw)
        ? (activePanelRaw as PanelId)
        : activePanelRaw // allow dynamic plugin panel IDs
      : null;

  const setActivePanel = useCallback((panel: PanelId | null) => {
    setActivePanelRaw(panel ?? '');
  }, [setActivePanelRaw]);

  /** Toggle a panel: open it if not active, close it if already active. */
  const togglePanel = useCallback((panel: PanelId) => {
    setActivePanelRaw(activePanelRaw === panel ? '' : panel);
  }, [activePanelRaw, setActivePanelRaw]);

  const showFileTree = activePanel === 'filetree';
  const showToc = activePanel === 'toc';
  const showSearchPanel = activePanel === 'search';
  const showGitPanel = activePanel === 'git';
  const showPluginsPanel = activePanel === 'plugins';

  return {
    activePanel, setActivePanel, togglePanel,
    showFileTree, showToc, showSearchPanel, showGitPanel, showPluginsPanel,
  };
}
