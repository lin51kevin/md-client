import { useState, useCallback, useEffect, useRef } from 'react';
import type { PluginPermission } from '../plugins/types';
import { PERMISSION_DESCRIPTIONS } from '../plugins/permissions';
import { validatePluginId } from '../plugins/plugin-loader';
import { StorageKeys } from '../lib/storage';

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

const STORAGE_KEY = StorageKeys.INSTALLED_PLUGINS;

/** Plugin IDs that are hidden from the UI (built-in features supersede them). */
const HIDDEN_PLUGIN_IDS = new Set<string>([]);

const DEFAULT_PLUGINS: PluginUIItem[] = [
  // ── Enabled by default (core Markdown experience) ────────────────
  {
    id: 'marklite-file-icons',
    name: 'File Icons',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '文件树按扩展名显示语言颜色图标',
    enabled: true,
    permissions: [],
  },
  {
    id: 'marklite-katex',
    name: 'KaTeX Math',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '数学公式渲染 — 支持 LaTeX 行内公式 $...$ 和块级公式 $$...$$',
    enabled: true,
    permissions: ['preview.extend', 'storage'],
  },
  {
    id: 'marklite-mermaid',
    name: 'Mermaid Diagrams',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '渲染 Mermaid 图表为 SVG — 流程图、时序图、甘特图、思维导图等',
    enabled: true,
    permissions: ['preview.extend', 'editor.extend', 'storage', 'settings.section'],
  },
  {
    id: 'marklite-smart-autocomplete',
    name: 'Smart Autocomplete',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '智能代码补全 — 文件路径补全、代码片段、上下文感知建议',
    enabled: true,
    permissions: ['editor.extend'],
  },
  {
    id: 'marklite-markdown-lint',
    name: 'Markdown Lint',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: 'Markdown 格式检查 — 标题风格、列表缩进、空行规则',
    enabled: true,
    permissions: ['editor.extend'],
  },
  {
    id: 'marklite-table-editor-pro',
    name: 'Table Editor Pro',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '增强表格编辑器 — 可视化编辑、行列增删、对齐调整、合并单元格',
    enabled: true,
    permissions: ['editor.read', 'editor.write', 'contextmenu.item', 'commands', 'sidebar.panel'],
  },
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
    id: 'marklite-png-export',
    name: 'PNG Export',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '将预览区导出为 PNG 图片',
    enabled: true,
    permissions: ['export', 'commands'],
  },
  // ── Disabled by default (opt-in features) ────────────────────────
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
    id: 'marklite-ai-copilot',
    name: 'AI Copilot',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: 'AI 辅助编辑 — 智能改写、解释、翻译、总结',
    enabled: false,
    permissions: ['sidebar.panel', 'editor.read', 'editor.write', 'storage', 'commands', 'ui.message', 'workspace', 'contextmenu.item'],
  },
  {
    id: 'marklite-git',
    name: 'Git Integration',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '内置 Git 面板 — 分支信息、变更列表、Diff 查看、提交/推送/拉取',
    enabled: false,
    permissions: ['sidebar.panel', 'workspace', 'storage', 'commands', 'ui.message', 'git.command'],
  },
  {
    id: 'marklite-vim',
    name: 'Vim Mode',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: 'Vim 键盘映射 — hjkl 导航、dd 删除行等',
    enabled: false,
    permissions: ['editor.extend', 'storage'],
  },
  {
    id: 'marklite-minimap',
    name: 'Minimap',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: 'CodeMirror minimap — 右侧代码缩略图导航',
    enabled: false,
    permissions: ['editor.extend'],
  },
  {
    id: 'marklite-daily-notes',
    name: 'Daily Notes',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '每日笔记 — Ctrl+D 快速创建/打开当日笔记，支持模板变量',
    enabled: false,
    permissions: ['workspace', 'commands', 'storage', 'editor.write', 'sidebar.panel'],
  },
  {
    id: 'marklite-document-templates',
    name: 'Document Templates',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '文档模板 — 新建文件时选择预定义模板，支持日期、时间等动态变量',
    enabled: false,
    permissions: ['commands', 'storage', 'editor.write', 'sidebar.panel'],
  },
  {
    id: 'marklite-frontmatter-editor',
    name: 'Frontmatter Editor',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: 'YAML Frontmatter 可视化编辑器 — 侧边栏显示/编辑文档元数据',
    enabled: false,
    permissions: ['editor.read', 'editor.write', 'sidebar.panel'],
  },
  {
    id: 'marklite-tag-system',
    name: 'Tag System',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '标签系统 — 扫描文档中的 #标签，提供标签云聚合导航',
    enabled: false,
    permissions: ['workspace', 'sidebar.panel', 'editor.read', 'storage', 'commands'],
  },
  {
    id: 'marklite-terminal',
    name: 'Terminal',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '内置终端 — 底部面板集成 shell 终端，支持命令执行',
    enabled: false,
    permissions: ['shell.execute', 'sidebar.panel', 'commands', 'storage'],
  },
];

/** Migration map: old plugin IDs → new marklite-* IDs */
const ID_MIGRATION: Record<string, string> = {
  'backlinks-panel': 'marklite-backlinks',
  'graph-view': 'marklite-graph-view',
};

function migratePluginIds(plugins: PluginUIItem[]): PluginUIItem[] {
  let changed = false;
  const migrated = plugins
    .filter((p) => {
      if (HIDDEN_PLUGIN_IDS.has(p.id) || HIDDEN_PLUGIN_IDS.has(ID_MIGRATION[p.id] ?? '')) {
        changed = true;
        return false;
      }
      return true;
    })
    .map((p) => {
      const newId = ID_MIGRATION[p.id];
      if (newId) {
        changed = true;
        return { ...p, id: newId };
      }
      return p;
    });

  // Merge any default plugins that are missing (e.g. newly added ones)
  const existingIds = new Set(migrated.map((p) => p.id));
  for (const dp of DEFAULT_PLUGINS) {
    if (!existingIds.has(dp.id)) {
      changed = true;
      migrated.push(dp);
    }
  }

  if (changed) {
    // Note: persistence is handled by the useEffect in usePlugins; do not call
    // savePlugins here to avoid double-writes during React initialisation.
  }
  return migrated;
}

function loadPlugins(): PluginUIItem[] {
  try {
    const OLD_STORAGE_KEY = StorageKeys.INSTALLED_PLUGINS_LEGACY;
    
    // First check new key
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migratePluginIds(JSON.parse(raw) as PluginUIItem[]);
    
    // If new key doesn't exist, check old key for migration
    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      try {
        const oldData = JSON.parse(oldRaw) as PluginUIItem[];
        const migrated = migratePluginIds(oldData);
        // Remove old key; the useEffect in usePlugins will persist to the new key
        localStorage.removeItem(OLD_STORAGE_KEY);
        return migrated;
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
    onActivateRef.current?.(id).catch((e) =>
      console.error(`[Plugin] activate failed for "${id}":`, e),
    );
  }, []);

  const disablePlugin = useCallback((id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: false } : p)),
    );
    onDeactivateRef.current?.(id).catch((e) =>
      console.error(`[Plugin] deactivate failed for "${id}":`, e),
    );
  }, []);

  const removePlugin = useCallback((id: string) => {
    // Deactivate before removing so sidebar panels are cleaned up
    onDeactivateRef.current?.(id).catch((e) =>
      console.error(`[Plugin] deactivate on remove failed for "${id}":`, e),
    );
    setPlugins((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePlugin = useCallback((id: string) => {
    setPlugins((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p));
      const plugin = updated.find((p) => p.id === id);
      if (plugin?.enabled) {
        onActivateRef.current?.(id).catch((e) =>
          console.error(`[Plugin] activate failed for "${id}":`, e),
        );
      } else {
        onDeactivateRef.current?.(id).catch((e) =>
          console.error(`[Plugin] deactivate failed for "${id}":`, e),
        );
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
    // Security: reject IDs containing path traversal sequences
    try { validatePluginId(manifest.id); } catch { return false; }
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
      try { validatePluginId(newPlugin.id ?? ''); } catch { return false; }
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
          try { validatePluginId(newPlugin.id ?? ''); } catch { resolve(false); return; }
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
