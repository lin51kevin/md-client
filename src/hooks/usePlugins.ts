import { useState, useCallback, useEffect } from 'react';

export interface PluginUIItem {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  permissions: string[];
}

const STORAGE_KEY = 'marklite-installed-plugins';

const DEFAULT_PLUGINS: PluginUIItem[] = [
  {
    id: 'backlinks-panel',
    name: 'Backlinks Panel',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '显示当前文档的反向链接',
    enabled: true,
    permissions: ['sidebar', 'document-read'],
  },
  {
    id: 'graph-view',
    name: 'Graph View',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '双向链接知识图谱可视化',
    enabled: false,
    permissions: ['sidebar', 'document-read'],
  },
];

function loadPlugins(): PluginUIItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PluginUIItem[];
  } catch { /* ignore */ }
  return DEFAULT_PLUGINS;
}

function savePlugins(plugins: PluginUIItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
}

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginUIItem[]>(loadPlugins);

  // Sync to localStorage whenever plugins change
  useEffect(() => {
    savePlugins(plugins);
  }, [plugins]);

  const enablePlugin = useCallback((id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: true } : p)),
    );
  }, []);

  const disablePlugin = useCallback((id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: false } : p)),
    );
  }, []);

  const removePlugin = useCallback((id: string) => {
    setPlugins((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePlugin = useCallback((id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  }, []);

  const installFromFile = useCallback(async (): Promise<boolean> => {
    // Try Tauri dialog first, fallback to native file input
    const readManifest = async (text: string): Promise<PluginUIItem | null> => {
      try {
        const manifest = JSON.parse(text) as Partial<PluginUIItem>;
        if (!manifest.id || !manifest.name || !manifest.version) return null;
        return {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          author: manifest.author ?? 'Unknown',
          description: manifest.description ?? '',
          enabled: false,
          permissions: manifest.permissions ?? [],
        };
      } catch {
        return null;
      }
    };

    const addPlugin = (newPlugin: PluginUIItem): boolean => {
      let added = false;
      setPlugins((prev) => {
        if (prev.some((p) => p.id === newPlugin.id)) return prev;
        added = true;
        return [...prev, newPlugin];
      });
      return added;
    };

    try {
      // @ts-expect-error - Tauri API available at runtime
      const { open } = await import('@tauri-apps/api/dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Plugin Package', extensions: ['json', 'zip'] }],
      });
      if (!selected || typeof selected === 'object') return false;
      // @ts-expect-error - Tauri API available at runtime
      const { readTextFile } = await import('@tauri-apps/api/fs');
      const content = await readTextFile(selected as string);
      const newPlugin = await readManifest(content);
      if (!newPlugin) return false;
      return addPlugin(newPlugin);
    } catch {
      // Fallback: native file input
      return new Promise<boolean>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) { resolve(false); return; }
          const text = await file.text();
          const newPlugin = await readManifest(text);
          if (!newPlugin) { resolve(false); return; }
          resolve(addPlugin(newPlugin));
        };
        input.click();
      });
    }
  }, []);

  return { plugins, enablePlugin, disablePlugin, removePlugin, togglePlugin, installFromFile };
}
