import type { Disposable } from './types';
import type { PluginPermission } from './permissions';
import { PluginPermissionError } from './permission-checker';

// ── API → Permission mapping ──────────────────────────────────────────────

const PERMISSION_MAP: Record<string, Record<string, PluginPermission>> = {
  editor: {
    getContent: 'editor.read',
    getSelection: 'editor.read',
    getCursorPosition: 'editor.read',
    insertText: 'editor.write',
    replaceRange: 'editor.write',
    registerExtension: 'editor.extend',
    getActiveFilePath: 'editor.read',
    onLanguageChanged: 'editor.read',
  },
  sidebar: {
    registerPanel: 'sidebar.panel',
  },
  statusbar: {
    addItem: 'statusbar.item',
  },
  contextMenu: {
    addItem: 'contextmenu.item',
  },
  files: {
    readFile: 'file.read',
    watch: 'file.watch',
  },
  workspace: {
    getAllFiles: 'workspace',
    openFile: 'workspace',
    createNewDoc: 'workspace',
    onFileChanged: 'workspace',
  },
  commands: {
    register: 'commands',
  },
  preview: {
    registerRenderer: 'preview.extend',
    registerRemarkPlugin: 'preview.extend',
  },
  settings: {
    registerSection: 'settings.section',
  },
  theme: {
    register: 'theme',
  },
  export: {
    registerExporter: 'export',
  },
  ui: {
    showMessage: 'ui.message',
    showModal: 'ui.message',
  },
};

// Namespaces where ALL methods require the same permission
const WILDCARD_NAMESPACES: Record<string, PluginPermission> = {
  storage: 'storage',
};

function resolvePermission(namespace: string, method: string): PluginPermission | null {
  // Wildcard namespaces first
  if (WILDCARD_NAMESPACES[namespace]) return WILDCARD_NAMESPACES[namespace];
  // Explicit method mapping
  return PERMISSION_MAP[namespace]?.[method] ?? null;
}

// ── Sandbox factory ────────────────────────────────────────────────────────

// ── Typed API interfaces ───────────────────────────────────────────────────

export interface CommandsAPI {
  register(
    id: string,
    handler: (...args: unknown[]) => void,
    options?: { label?: string; labelEn?: string; when?: () => boolean; category?: string }
  ): Disposable;
}

export interface SidebarAPI {
  registerPanel(id: string, options: { title: string; icon?: string; render: () => unknown }): Disposable;
}

export interface StatusBarAPI {
  addItem(element: unknown): Disposable;
}

export interface EditorAPI {
  getContent(): string;
  getSelection(): { from: number; to: number; text: string } | null;
  getCursorPosition(): { line: number; column: number; offset: number };
  insertText(text: string, from?: number, to?: number): void;
  replaceRange(from: number, to: number, text: string): void;
  getActiveFilePath(): string | null;
  registerExtension(extension: unknown): Disposable;
  onLanguageChanged(callback: (info: { languageId: string; filePath: string | null }) => void): Disposable;
}

export interface WorkspaceAPI {
  getActiveFile(): { path: string | null; name: string | null };
  getAllFiles(): string[];
  openFile(path: string): void;
  onFileChanged(callback: (file: { path: string; name: string }) => void): Disposable;
  createNewDoc(content?: string): void;
}

export interface StorageAPI {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface UIAPI {
  showMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
  showModal(options: { title: string; content: string; type?: 'info' | 'confirm' }): Promise<boolean | void>;
}

export interface PreviewAPI {
  registerRenderer(nodeType: string, renderFn: (props: Record<string, unknown> & { defaultRender: React.ComponentType<Record<string, unknown>> }) => React.ReactNode): Disposable;
  registerRemarkPlugin(plugin: unknown): Disposable;
}

export interface PluginContext {
  commands: CommandsAPI;
  sidebar: SidebarAPI;
  statusbar: StatusBarAPI;
  editor: EditorAPI;
  workspace: WorkspaceAPI;
  storage: StorageAPI;
  ui: UIAPI;
  files: { readFile(path: string): Promise<string | null>; watch(pattern: string, callback: (path: string) => void): Disposable };
  contextMenu: import('./plugin-context-menu').ContextMenuAPI;
  preview: PreviewAPI;
  settings: { registerSection(section: unknown): Disposable };
  theme: { register(cssVars: unknown): Disposable };
  export: { registerExporter(format: string, fn: unknown): Disposable };
}

/**
 * Create a sandbox proxy that wraps the plugin context and enforces permissions.
 */
export function createSandbox(
  context: PluginContext,
  hasPermission: (permission: PluginPermission) => boolean,
): PluginContext {
  return new Proxy({} as PluginContext, {
    get(_target, namespace: string) {
      const api = (context as unknown as Record<string, unknown>)[namespace];
      if (api == null || typeof api !== 'object') return undefined;

      return new Proxy(api as Record<string, (...args: unknown[]) => unknown>, {
        get(_apiTarget, method: string) {
          const fn = (api as Record<string, unknown>)[method];
          // Non-function properties are not exposed through the sandbox.
          // All plugin API surface is function-based; returning undefined prevents
          // unintended access to internal state without a permission check.
          if (typeof fn !== 'function') return undefined;

          const permission = resolvePermission(namespace, method);

          return (...args: unknown[]) => {
            if (permission && !hasPermission(permission)) {
              throw new PluginPermissionError(permission);
            }
            return (fn as Function)(...args);
          };
        },
      });
    },
  });
}
