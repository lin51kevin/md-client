import type { PluginContext } from './plugin-sandbox';

/**
 * Create the workspace API for plugin contexts.
 * Allows plugins to access workspace files and react to file changes.
 *
 * @param deps - Workspace integration callbacks from the host app.
 * @returns The workspace portion of the plugin context.
 */
export function createWorkspaceAPI(deps: {
  getActiveTab: () => { path: string | null; content: string } | null;
  openFileInTab: (path: string) => void;
  getOpenFilePaths: () => string[];
  getAllWorkspaceFiles?: () => string[];
  openNewUntitled?: (content: string) => void;
}): PluginContext['workspace'] {
  return {
    /**
     * Get the currently active file info.
     * @returns Object with `path` and `name`, or both null if no file is active.
     */
    getActiveFile() {
      const tab = deps.getActiveTab();
      return tab
        ? { path: tab.path, name: tab.path ? tab.path.split(/[/\\]/).pop() ?? null : null }
        : { path: null, name: null };
    },

    /**
     * Get all available file paths.
     * Uses `getAllWorkspaceFiles` if available, otherwise falls back to open tabs.
     * @returns Array of file path strings.
     */
    getAllFiles() {
      return deps.getAllWorkspaceFiles ? deps.getAllWorkspaceFiles() : deps.getOpenFilePaths();
    },

    /**
     * Open a file in the editor.
     * @param path - File path to open.
     */
    openFile(path: string) {
      deps.openFileInTab(path);
    },

    /**
     * Subscribe to file change events.
     * @param _callback - Function called with the changed file info.
     * @returns A disposable that removes the listener.
     * @deprecated Not yet implemented — returns a no-op disposable.
     */
    onFileChanged(_callback: (file: { path: string; name: string }) => void) {
      return { dispose() {} };
    },
    createNewDoc(content?: string) {
      deps.openNewUntitled?.(content ?? '');
    },
  };
}
