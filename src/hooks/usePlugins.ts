import { useState, useCallback, useEffect, useRef } from 'react';
import type { PluginPermission } from '../plugins/types';
import { PERMISSION_DESCRIPTIONS } from '../plugins/permissions';

export interface PluginUIItem {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  permissions: string[];
}

export interface PendingPermissionRequest {
  plugin: PluginUIItem;
  permissions: PluginPermission[];
}

const STORAGE_KEY = 'marklite-installed-plugins';

const DEFAULT_PLUGINS: PluginUIItem[] = [
  {
    id: 'marklite-backlinks',
    name: 'Backlinks Panel',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '显示当前文档的反向链接',
    enabled: true,
    permissions: ['workspace', 'editor.read', 'sidebar.panel', 'storage'],
  },
  {
    id: 'marklite-graph-view',
    name: 'Graph View',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '双向链接知识图谱可视化',
    enabled: false,
    permissions: ['workspace', 'editor.read', 'sidebar.panel', 'storage'],
  },
  {
    id: 'marklite-snippet-manager',
    name: 'Snippet Manager',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '增强型代码片段管理，支持分类和变量占位符',
    enabled: false,
    permissions: ['storage', 'editor.write', 'commands', 'ui.message'],
  },
  {
    id: 'marklite-preview-edit',
    name: 'Preview Editor',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '在预览窗格中直接编辑文本，点击段落和标题即可原地修改',
    enabled: false,
    permissions: ['editor.read', 'editor.write', 'preview.extend'],
  },
];

function loadPlugins(): PluginUIItem[] {
  try {
    const OLD_STORAGE_KEY = 'marklite-ui-plugins';
    
    // First check new key
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PluginUIItem[];
    
    // If new key doesn't exist, check old key for migration
    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      try {
        const oldData = JSON.parse(oldRaw) as PluginUIItem[];
        // Migrate data to new key
        localStorage.setItem(STORAGE_KEY, oldRaw);
        // Optionally remove old key (optional, keep for safety)
        // localStorage.removeItem(OLD_STORAGE_KEY);
        return oldData;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return DEFAULT_PLUGINS;
}

function savePlugins(plugins: PluginUIItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
}

export function usePlugins(opts?: {
  onActivate?: (id: string) => Promise<void>;
  onDeactivate?: (id: string) => Promise<void>;
}) {
  const [plugins, setPlugins] = useState<PluginUIItem[]>(loadPlugins);
  const [pendingPermission, setPendingPermission] = useState<PendingPermissionRequest | null>(null);
  const pendingRef = useRef<PluginUIItem | null>(null);
  // Keep lifecycle callback refs stable so callbacks don't invalidate memoized handlers
  const onActivateRef = useRef(opts?.onActivate);
  const onDeactivateRef = useRef(opts?.onDeactivate);
  useEffect(() => {
    onActivateRef.current = opts?.onActivate;
    onDeactivateRef.current = opts?.onDeactivate;
  });

  // Sync to localStorage whenever plugins change
  useEffect(() => {
    savePlugins(plugins);
  }, [plugins]);

  const enablePlugin = useCallback((id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: true } : p)),
    );
    void onActivateRef.current?.(id);
  }, []);

  const disablePlugin = useCallback((id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: false } : p)),
    );
    void onDeactivateRef.current?.(id);
  }, []);

  const removePlugin = useCallback((id: string) => {
    setPlugins((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePlugin = useCallback((id: string) => {
    setPlugins((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p));
      const plugin = updated.find((p) => p.id === id);
      if (plugin?.enabled) {
        void onActivateRef.current?.(id);
      } else {
        void onDeactivateRef.current?.(id);
      }
      return updated;
    });
  }, []);

  const handleApprove = useCallback((granted: PluginPermission[]) => {
    const pending = pendingRef.current;
    if (!pending) return;

    const pluginWithPermissions: PluginUIItem = {
      ...pending,
      permissions: granted as unknown as string[],
    };

    setPlugins((prev) => {
      if (prev.some((p) => p.id === pending.id)) return prev;
      return [...prev, pluginWithPermissions];
    });

    pendingRef.current = null;
    setPendingPermission(null);
  }, []);

  const handleCancel = useCallback(() => {
    pendingRef.current = null;
    setPendingPermission(null);
  }, []);

  const addPluginFromManifest = useCallback((manifest: Partial<PluginUIItem>): boolean | 'pending_approval' => {
    const KNOWN_PERMISSIONS = new Set(Object.keys(PERMISSION_DESCRIPTIONS));
    if (!manifest.id || !manifest.name || !manifest.version) return false;
    const newPlugin: PluginUIItem = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      author: manifest.author ?? 'Unknown',
      description: manifest.description ?? '',
      enabled: false,
      permissions: manifest.permissions ?? [],
    };
    const validPermissions = newPlugin.permissions.filter(
      (p): p is PluginPermission => KNOWN_PERMISSIONS.has(p),
    );
    if (validPermissions.length > 0) {
      pendingRef.current = newPlugin;
      setPendingPermission({ plugin: newPlugin, permissions: validPermissions });
      return 'pending_approval';
    }
    let added = false;
    setPlugins((prev) => {
      if (prev.some((p) => p.id === newPlugin.id)) return prev;
      added = true;
      return [...prev, newPlugin];
    });
    return added;
  }, []);

  const installFromFile = useCallback(async (): Promise<boolean> => {
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

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Plugin Package', extensions: ['json', 'zip'] }],
      });
      if (!selected || typeof selected === 'object') return false;
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const content = await readTextFile(selected as string);
      const newPlugin = await readManifest(content);
      if (!newPlugin) return false;
      return addPluginFromManifest(newPlugin) === true;
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
          const result = addPluginFromManifest(newPlugin);
          resolve(result !== false);
        };
        input.click();
      });
    }
  }, []);

  return {
    plugins,
    enablePlugin,
    disablePlugin,
    removePlugin,
    togglePlugin,
    installFromFile,
    addPluginFromManifest,
    pendingPermission,
    onApprovePermissions: handleApprove,
    onCancelPermission: handleCancel,
  };
}
