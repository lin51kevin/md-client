import type { EditorView } from '@codemirror/view';
import type { Disposable } from './types';
import type { PluginContext } from './plugin-sandbox';
import { createCommandsAPI } from './plugin-commands';
import { createWorkspaceAPI } from './plugin-workspace';
import { createEditorAPI } from './plugin-editor';
import { createSidebarAPI } from './plugin-sidebar';
import { createStatusBarAPI } from './plugin-statusbar';
import { createStorageAPI } from './plugin-storage';
import { createUIAPI } from './plugin-ui';
import { createPreviewAPI } from './plugin-preview';
import { createContextMenuAPI } from './plugin-context-menu';

export interface SettingsSection {
  id: string;
  title: string;
  render: () => unknown;
  pluginId: string;
}

const registeredSections = new Map<string, SettingsSection>();

export function getRegisteredSections(): Map<string, SettingsSection> {
  return registeredSections;
}

/** Module-level exporter registry shared across all plugin contexts. */
const registeredExporters = new Map<string, (content: string, filePath: string) => Promise<void>>();

/** Get the shared exporter registry (for use by AppShell export menus). */
export function getRegisteredExporters() {
  return registeredExporters;
}

/**
 * Dependencies needed to assemble a full plugin context.
 * These are provided by the host application (App.tsx).
 */
export interface PluginContextDeps {
  /** Returns the currently active file tab, or null. */
  getActiveTab: () => { path: string | null; content: string } | null;
  /** Open a file in a new tab. */
  openFileInTab: (path: string) => void;
  /** Create a new untitled tab, optionally pre-filled with content. */
  openNewUntitled?: (content: string) => void;
  /** Returns file paths of all open tabs. */
  getOpenFilePaths: () => string[];
  /** Optional: returns all workspace files (including unopened). */
  getAllWorkspaceFiles?: () => string[];
  /** Subscribe to active file change events. Returns unsubscribe function. */
  onActiveFileChanged?: (callback: (file: { path: string; name: string }) => void) => () => void;
  /** React ref holding the current CodeMirror EditorView. */
  cmViewRef: React.RefObject<EditorView | null>;
  /** Register a sidebar panel by ID. */
  registerSidebarPanel: (id: string, component: unknown, meta?: { title?: string; icon?: string; position?: 'left' | 'bottom' }) => void;
  /** Unregister a sidebar panel by ID. */
  unregisterSidebarPanel: (id: string) => void;
  /** Add an element to the status bar. */
  addStatusBarItem: (element: unknown) => void;
  /** Remove a status bar element. */
  removeStatusBarItem: (element: unknown) => void;
  /** Register a preview renderer for a node type. */
  registerPreviewRenderer: (nodeType: string, renderFn: unknown) => void;
  /** Unregister a preview renderer for a node type. */
  unregisterPreviewRenderer: (nodeType: string) => void;
  /** Register a remark plugin for the preview pipeline. */
  registerPreviewRemarkPlugin?: (plugin: unknown) => Disposable;
  /** Unregister a remark plugin from the preview pipeline. */
  unregisterPreviewRemarkPlugin?: (plugin: unknown) => void;
  /** Read file content by absolute path. Returns null if file does not exist. */
  readFileContent?: (path: string) => Promise<string | null>;
  /** Watch files matching a glob pattern, call callback on changes. Returns unsubscribe. */
  watchFiles?: (pattern: string, callback: (path: string) => void) => () => void;
  /** Current language ID of the active editor. */
  currentLanguageId?: string;
  /** Subscribe to language change events. Returns unsubscribe. */
  onLanguageChange?: (callback: (info: { languageId: string; filePath: string | null }) => void) => () => void;
  /** Register a CodeMirror extension. Returns a Disposable. */
  registerEditorExtension?: (extension: unknown) => import('./types').Disposable;
}

/**
 * Create a complete plugin context by assembling all sub-APIs.
 *
 * @param deps - Host application dependencies.
 * @param pluginId - Optional plugin ID used for storage namespacing.
 * @returns A fully assembled PluginContext object.
 */
export function createPluginContext(deps: PluginContextDeps, pluginId?: string): PluginContext {
  // Wrap callback deps in lazy forwarders so they read through `deps` at call
  // time.  When `deps` is a Proxy (see usePluginRuntime), each access resolves
  // to the latest function, preventing stale closures after tab switches.
  return {
    commands: createCommandsAPI(),
    workspace: createWorkspaceAPI({
      getActiveTab: () => deps.getActiveTab?.() ?? null,
      openFileInTab: (p: string) => deps.openFileInTab(p),
      getOpenFilePaths: () => deps.getOpenFilePaths(),
      getAllWorkspaceFiles: deps.getAllWorkspaceFiles ? () => deps.getAllWorkspaceFiles!() : undefined,
      openNewUntitled: deps.openNewUntitled ? (c: string) => deps.openNewUntitled!(c) : undefined,
      onActiveFileChanged: deps.onActiveFileChanged,
    }),
    editor: createEditorAPI({
      cmViewRef: deps.cmViewRef,
      getActiveTab: () => deps.getActiveTab?.() ?? null,
      registerEditorExtension: deps.registerEditorExtension,
      currentLanguageId: deps.currentLanguageId,
      onLanguageChange: deps.onLanguageChange,
    }),
    sidebar: createSidebarAPI(deps),
    statusbar: createStatusBarAPI(deps),
    storage: createStorageAPI(pluginId) as PluginContext['storage'],
    ui: createUIAPI(),
    preview: createPreviewAPI(deps),
    settings: {
      registerSection(section: { id: string; title: string; render: () => unknown }) {
        const key = `${pluginId}:${section.id}`;
        registeredSections.set(key, { ...section, pluginId: pluginId ?? 'unknown' });
        return {
          dispose() {
            registeredSections.delete(key);
          },
        };
      },
    },
    theme: {
      register(cssVars: Record<string, string>) {
        const style = document.createElement('style');
        style.setAttribute('data-plugin-theme', pluginId ?? 'unknown');
        const rules = Object.entries(cssVars)
          .map(([key, val]) => `:root { ${key}: ${val}; }`)
          .join('\n');
        style.textContent = rules;
        document.head.appendChild(style);
        return {
          dispose() {
            style.remove();
          },
        };
      },
    },
    export: {
      registerExporter(format: string, fn: (content: string, filePath: string) => Promise<void>) {
        registeredExporters.set(format, fn);
        return {
          dispose() {
            if (registeredExporters.get(format) === fn) {
              registeredExporters.delete(format);
            }
          },
        };
      },
    },
    files: {
      readFile: async (path: string): Promise<string | null> => {
        if (!deps.readFileContent) return null;
        const absolute = path.startsWith('/') ? path : (() => {
          const tab = deps.getActiveTab?.();
          if (tab?.path) {
            const dir = tab.path.substring(0, tab.path.lastIndexOf('/'));
            return dir + '/' + path;
          }
          return '/' + path;
        })();
        return deps.readFileContent(absolute);
      },
      watch: (pattern: string, callback: (path: string) => void) => {
        if (!deps.watchFiles) return { dispose: () => {} };
        let disposed = false;
        const guarded = (path: string) => {
          if (!disposed) callback(path);
        };
        const unsub = deps.watchFiles(pattern, guarded);
        return {
          dispose: () => {
            disposed = true;
            unsub();
          },
        };
      },
    },
    contextMenu: createContextMenuAPI(),
  };
}