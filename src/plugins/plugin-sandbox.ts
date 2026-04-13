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

export interface PluginContext {
  editor: Record<string, (...args: unknown[]) => unknown>;
  sidebar: Record<string, (...args: unknown[]) => unknown>;
  statusbar: Record<string, (...args: unknown[]) => unknown>;
  contextMenu: Record<string, (...args: unknown[]) => unknown>;
  files: Record<string, (...args: unknown[]) => unknown>;
  workspace: Record<string, (...args: unknown[]) => unknown>;
  commands: Record<string, (...args: unknown[]) => unknown>;
  storage: Record<string, (...args: unknown[]) => unknown>;
  ui: Record<string, (...args: unknown[]) => unknown>;
  preview: Record<string, (...args: unknown[]) => unknown>;
  settings: Record<string, (...args: unknown[]) => unknown>;
  theme: Record<string, (...args: unknown[]) => unknown>;
  export: Record<string, (...args: unknown[]) => unknown>;
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
