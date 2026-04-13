export function createWorkspaceAPI(deps: {
  getActiveTab: () => { path: string | null; content: string } | null;
  openFileInTab: (path: string) => void;
  getOpenFilePaths: () => string[];
}): Record<string, (...args: unknown[]) => unknown> {
  return {
    getActiveFile() {
      const tab = deps.getActiveTab();
      return tab ? { path: tab.path, content: tab.content } : null;
    },
    getAllFiles() {
      return deps.getOpenFilePaths();
    },
    openFile(path: string) {
      deps.openFileInTab(path);
    },
    onFileChanged(_handler: (...args: unknown[]) => void) {
      return { dispose() {} };
    },
  };
}
