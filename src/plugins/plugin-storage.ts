import type { InstalledPluginRecord } from './types';
import type { PluginContext } from './plugin-sandbox';

// ── Phase 1: PluginStorage class (for lifecycle management) ────────────────

const STORAGE_KEY = 'marklite-installed-plugins';

/**
 * Manages persistence of installed plugin records in localStorage.
 * Used by the plugin lifecycle system (install, update, remove).
 */
export class PluginStorage {
  /** Load all installed plugin records from localStorage. */
  getInstalledPlugins(): InstalledPluginRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as InstalledPluginRecord[]) : [];
    } catch {
      console.warn('[PluginHost] Failed to read installed plugins from storage');
      return [];
    }
  }

  /** Save the full list of installed plugins to localStorage. */
  saveInstalledPlugins(plugins: InstalledPluginRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
    } catch {
      console.warn('[PluginHost] Failed to save installed plugins to storage');
    }
  }

  /** Add or update a plugin record (upsert by ID). */
  addPlugin(record: InstalledPluginRecord): void {
    const plugins = this.getInstalledPlugins();
    const idx = plugins.findIndex((p) => p.id === record.id);
    if (idx >= 0) {
      plugins[idx] = record;
    } else {
      plugins.push(record);
    }
    this.saveInstalledPlugins(plugins);
  }

  /** Remove a plugin record by ID. */
  removePlugin(id: string): void {
    const plugins = this.getInstalledPlugins().filter((p) => p.id !== id);
    this.saveInstalledPlugins(plugins);
  }

  /** Partially update an existing plugin record by ID. */
  updatePlugin(id: string, updates: Partial<InstalledPluginRecord>): void {
    const plugins = this.getInstalledPlugins();
    const idx = plugins.findIndex((p) => p.id === id);
    if (idx >= 0) {
      plugins[idx] = { ...plugins[idx], ...updates };
      this.saveInstalledPlugins(plugins);
    }
  }
}

// ── Phase 2: createStorageAPI (for plugin runtime API) ─────────────────────

/**
 * Create a namespaced storage API for a specific plugin.
 * All keys are prefixed with `plugin.<pluginId>.` to prevent collisions.
 *
 * @param pluginId - The plugin ID used as namespace prefix.
 * @returns The storage portion of the plugin context (get/set/delete).
 */
export function createStorageAPI(pluginId?: string): PluginContext['storage'] {
  const prefix = pluginId ? `plugin.${pluginId}.` : 'plugin.';

  return {
    async get(key: string): Promise<string | null> {
      return localStorage.getItem(prefix + key);
    },
    async set(key: string, value: string): Promise<void> {
      localStorage.setItem(prefix + key, value);
    },
    async delete(key: string): Promise<void> {
      localStorage.removeItem(prefix + key);
    },
  };
}