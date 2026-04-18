/**
 * useSidebarPanel — compatibility wrapper around UI store.
 *
 * Reads/writes activePanel from useUIStore.  The derived boolean flags
 * (showFileTree, showToc, etc.) and togglePanel are preserved so that
 * all existing consumers continue to work unchanged.
 */

import { useUIStore } from '../stores';

export function useSidebarPanel() {
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const togglePanel = useUIStore((s) => s.togglePanel);

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
