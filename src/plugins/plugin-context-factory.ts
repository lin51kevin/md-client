import type { EditorView } from '@codemirror/view';
import type { PluginContext } from './plugin-sandbox';
import { createCommandsAPI } from './plugin-commands';
import { createWorkspaceAPI } from './plugin-workspace';
import { createEditorAPI } from './plugin-editor';
import { createSidebarAPI } from './plugin-sidebar';
import { createStatusBarAPI } from './plugin-statusbar';
import { createStorageAPI } from './plugin-storage';
import { createUIAPI } from './plugin-ui';

export interface PluginContextDeps {
  getActiveTab: () => { path: string | null; content: string } | null;
  openFileInTab: (path: string) => void;
  getOpenFilePaths: () => string[];
  cmViewRef: React.RefObject<EditorView | null>;
  registerSidebarPanel: (id: string, component: unknown) => void;
  unregisterSidebarPanel: (id: string) => void;
  addStatusBarItem: (element: unknown) => void;
  removeStatusBarItem: (element: unknown) => void;
}

export function createPluginContext(deps: PluginContextDeps, pluginId?: string): PluginContext {
  return {
    commands: createCommandsAPI(),
    workspace: createWorkspaceAPI(deps),
    editor: createEditorAPI(deps),
    sidebar: createSidebarAPI(deps),
    statusbar: createStatusBarAPI(deps),
    storage: createStorageAPI(pluginId),
    ui: createUIAPI(),
    preview: { registerRenderer: () => ({ dispose: () => {} }) },
    settings: { registerSection: () => ({ dispose: () => {} }) },
    theme: { register: () => ({ dispose: () => {} }) },
    export: { registerExporter: () => ({ dispose: () => {} }) },
    files: { readFile: async () => null, watch: () => ({ dispose: () => {} }) },
    contextMenu: { addItem: () => ({ dispose: () => {} }) },
  };
}
