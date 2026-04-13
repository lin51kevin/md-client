import { useCallback } from 'react';
import { useLocalStorageString } from './useLocalStorage';
import { PANEL_ITEMS, type PanelId } from '../components/ActivityBar';

export function useSidebarPanel() {
  const [activePanelRaw, setActivePanelRaw] = useLocalStorageString('marklite-active-panel', '');
  const VALID_PANELS = PANEL_ITEMS.map(item => item.id);
  const activePanel: PanelId | null =
    activePanelRaw && (VALID_PANELS as readonly string[]).includes(activePanelRaw)
      ? (activePanelRaw as PanelId)
      : null;

  const setActivePanel = useCallback((panel: PanelId | null) => {
    setActivePanelRaw(panel ?? '');
  }, [setActivePanelRaw]);

  const showFileTree = activePanel === 'filetree';
  const showToc = activePanel === 'toc';
  const showSearchPanel = activePanel === 'search';
  const showGitPanel = activePanel === 'git';

  return {
    activePanel, setActivePanel,
    showFileTree, showToc, showSearchPanel, showGitPanel,
  };
}
