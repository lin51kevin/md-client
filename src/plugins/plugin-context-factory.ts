import type { EditorView } from '@codemirror/view';
import type { PluginContext } from './plugin-sandbox';
import { createCommandsAPI } from './plugin-commands';
import { createWorkspaceAPI } from './plugin-workspace';
import { createEditorAPI } from './plugin-editor';
import { createSidebarAPI } from './plugin-sidebar';
import { createStatusBarAPI } from './plugin-statusbar';
import { createStorageAPI } from './plugin-storage';
import { createUIAPI } from './plugin-ui';

/**
 * Dependencies needed to assemble a full plugin context.
 * These are provided by the host application (App.tsx).
 */
export interface PluginContextDeps {
  /** Returns the currently active file tab, or null. */
  getActiveTab: () => { path: string | null; content: string } | null;
  /** Open a file in a new tab. */
  openFileInTab: (path: string) => void;
  /** Returns file paths of all open tabs. */
  getOpenFilePaths: () => string[];
  /** Optional: returns all workspace files (including unopened). */
  getAllWorkspaceFiles?: () => string[];
  /** React ref holding the current CodeMirror EditorView. */
  cmViewRef: React.RefObject<EditorView | null>;
  /** Register a sidebar panel by ID. */
  registerSidebarPanel: (id: string, component: unknown) => void;
  /** Unregister a sidebar panel by ID. */
  unregisterSidebarPanel: (id: string) => void;
  /** Add an element to the status bar. */
  addStatusBarItem: (element: unknown) => void;
  /** Remove a status bar element. */
  removeStatusBarItem: (element: unknown) => void;
}

/**
 * Create a complete plugin context by assembling all sub-APIs.
 *
 * @param deps - Host application dependencies.
 * @param pluginId - Optional plugin ID used for storage namespacing.
 * @returns A fully assembled PluginContext object.
 */
export function createPluginContext(deps: PluginContextDeps, pluginId?: string): PluginContext {
  return {
    commands: createCommandsAPI(),
    workspace: createWorkspaceAPI(deps),
    editor: createEditorAPI({ cmViewRef: deps.cmViewRef, getActiveTab: deps.getActiveTab }),
    sidebar: createSidebarAPI(deps),
    statusbar: createStatusBarAPI(deps),
    storage: createStorageAPI(pluginId) as PluginContext['storage'],
    ui: createUIAPI(),
    preview: { registerRenderer: () => ({ dispose: () => {} }) },
    settings: { registerSection: () => ({ dispose: () => {} }) },
    theme: { register: () => ({ dispose: () => {} }) },
    export: { registerExporter: () => ({ dispose: () => {} }) },
    files: { readFile: async () => null, watch: () => ({ dispose: () => {} }) },
    contextMenu: { addItem: () => ({ dispose: () => {} }) },
  };
}