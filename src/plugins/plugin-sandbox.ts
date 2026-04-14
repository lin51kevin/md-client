import type { Disposable } from './types';
import type { PluginPermission } from './permissions';
import { PluginPermissionError } from './permission-checker';

// ── API → Permission mapping ──────────────────────────────────────────────

const PERMISSION_MAP: Record<string, Record<string, PluginPermission>> = {
  editor: {
    getContent: 'editor.read',
    insertText: 'editor.write',
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
  },
  commands: {
    register: 'commands',
  },
  preview: {
    registerRenderer: 'preview.extend',
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
};

// Namespaces where ALL methods require the same permission
const WILDCARD_NAMESPACES: Record<string, PluginPermission> = {
  storage: 'storage',
  ui: 'ui.message',
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
  register(id: string, handler: (...args: unknown[]) => void): Disposable;
}

export interface SidebarAPI {
  registerPanel(id: string, options: { title: string; icon?: string; render: () => unknown }): Disposable;
}

export interface StatusBarAPI {
  addItem(element: unknown): Disposable;
}

export interface EditorAPI {
  getContent(): string;
  insertText(text: string, from?: number, to?: number): void;
  getActiveFilePath(): string | null;
}

export interface WorkspaceAPI {
  getActiveFile(): { path: string | null; name: string | null };
  getAllFiles(): string[];
  openFile(path: string): void;
  onFileChanged(callback: (file: { path: string; name: string }) => void): Disposable;
}

export interface StorageAPI {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface UIAPI {
  showMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
  showModal(options: { title: string; content: string }): Promise<void>;
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
  contextMenu: { addItem(item: unknown): Disposable };
  preview: { registerRenderer(type: string, renderFn: unknown): Disposable };
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
          if (typeof fn !== 'function') return fn;

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
