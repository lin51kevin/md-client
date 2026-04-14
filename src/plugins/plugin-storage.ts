import type { InstalledPluginRecord } from './types';
import type { PluginContext } from './plugin-sandbox';

// ── Phase 1: PluginStorage class (for lifecycle management) ────────────────

const STORAGE_KEY = 'marklite-installed-plugins';

export class PluginStorage {
  getInstalledPlugins(): InstalledPluginRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as InstalledPluginRecord[]) : [];
    } catch {
      console.warn('[PluginHost] Failed to read installed plugins from storage');
      return [];
    }
  }

  saveInstalledPlugins(plugins: InstalledPluginRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
    } catch {
      console.warn('[PluginHost] Failed to save installed plugins to storage');
    }
  }

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

  removePlugin(id: string): void {
    const plugins = this.getInstalledPlugins().filter((p) => p.id !== id);
    this.saveInstalledPlugins(plugins);
  }

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