import type { PluginContext } from './plugin-sandbox';

export function createWorkspaceAPI(deps: {
  getActiveTab: () => { path: string | null; content: string } | null;
  openFileInTab: (path: string) => void;
  getOpenFilePaths: () => string[];
  getAllWorkspaceFiles?: () => string[];
}): PluginContext['workspace'] {
  return {
    getActiveFile() {
      const tab = deps.getActiveTab();
      return tab ? { path: tab.path, name: tab.path ? tab.path.split(/[/\\]/).pop() ?? null : null } : { path: null, name: null };
    },
    getAllFiles() {
      return deps.getAllWorkspaceFiles ? deps.getAllWorkspaceFiles() : deps.getOpenFilePaths();
    },
    openFile(path: string) {
      deps.openFileInTab(path);
    },
    onFileChanged(_callback: (file: { path: string; name: string }) => void) {
      return { dispose() {} };
    },
  };
}