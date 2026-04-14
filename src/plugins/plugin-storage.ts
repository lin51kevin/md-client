import type { InstalledPluginRecord } from './types';
import type { PluginContext } from './plugin-sandbox';

// ── Phase 1: PluginStorage class (for lifecycle management) ────────────────

const STORAGE_KEY = 'marklite-installed-plugins';

/**
 * Manages persistence of installed plugin records in localStorage.
 * Used by the plugin lifecycle system (install, update, remove).
 */
export class PluginStorage {
  /**
   * Load all installed plugin records from localStorage.
   * @returns Array of installed plugin records. Returns empty array on failure.
   */
  getInstalledPlugins(): InstalledPluginRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as InstalledPluginRecord[]) : [];
    } catch {
      console.warn('[PluginHost] Failed to read installed plugins from storage');
      return [];
    }
  }

  /**
   * Save the full list of installed plugins to localStorage.
   * @param plugins - The complete list of installed plugin records to persist.
   */
  saveInstalledPlugins(plugins: InstalledPluginRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
    } catch {
      console.warn('[PluginHost] Failed to save installed plugins to storage');
    }
  }

  /**
   * Add or update a plugin record (upsert by ID).
   * If a record with the same ID exists, it will be replaced.
   * @param record - The plugin record to add or update.
   */
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

  /**
   * Remove a plugin record by ID.
   * No-op if the ID is not found.
   * @param id - The plugin ID to remove.
   */
  removePlugin(id: string): void {
    const plugins = this.getInstalledPlugins().filter((p) => p.id !== id);
    this.saveInstalledPlugins(plugins);
  }

  /**
   * Partially update an existing plugin record by ID.
   * No-op if the ID is not found.
   * @param id - The plugin ID to update.
   * @param updates - Partial record with fields to merge into the existing record.
   */
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
    /**
     * Get a value from plugin-scoped storage.
     * @param key - Storage key (automatically prefixed with plugin namespace).
     * @returns The stored value as a string, or null if not found.
     */
    async get(key: string): Promise<string | null> {
      return localStorage.getItem(prefix + key);
    },
    /**
     * Set a value in plugin-scoped storage.
     * @param key - Storage key (automatically prefixed with plugin namespace).
     * @param value - The string value to store.
     */
    async set(key: string, value: string): Promise<void> {
      localStorage.setItem(prefix + key, value);
    },
    /**
     * Delete a value from plugin-scoped storage.
     * @param key - Storage key (automatically prefixed with plugin namespace).
     */
    async delete(key: string): Promise<void> {
      localStorage.removeItem(prefix + key);
    },
  };
}