export function createStorageAPI(pluginId?: string): Record<string, (...args: unknown[]) => unknown> {
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
