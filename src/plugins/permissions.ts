/**
 * Plugin permissions — permission levels, descriptions, and dangerous set.
 *
 * The canonical PluginPermission type lives in ./types and is re-exported here
 * for convenience so callers don't need to import from two places.
 */

export type { PluginPermission } from './types';
import type { PluginPermission } from './types';

// ── Permission levels ──────────────────────────────────────────────────────

export type PermissionLevel = 'low' | 'medium' | 'high' | 'critical';

const LOW: readonly PluginPermission[] = [
  'editor.read', 'editor.decorate', 'statusbar.item', 'ui.message',
];

const MEDIUM: readonly PluginPermission[] = [
  'commands', 'storage', 'contextmenu.item', 'settings.section',
  'sidebar.panel', 'editor.extend',
];

const HIGH: readonly PluginPermission[] = [
  'editor.write', 'file.read', 'file.watch', 'preview.extend',
  'theme', 'export', 'workspace',
];

const CRITICAL: readonly PluginPermission[] = [
  'shell.execute', 'git.command', 'tauri.raw', 'file.write',
];

const LEVEL_MAP: Readonly<Record<PluginPermission, PermissionLevel>> = Object.fromEntries([
  ...LOW.map(p => [p, 'low' as const]),
  ...MEDIUM.map(p => [p, 'medium' as const]),
  ...HIGH.map(p => [p, 'high' as const]),
  ...CRITICAL.map(p => [p, 'critical' as const]),
]) as Record<PluginPermission, PermissionLevel>;

/** Return the permission level for a given permission. */
export function getPermissionLevel(permission: PluginPermission): PermissionLevel {
  return LEVEL_MAP[permission];
}

// ── Descriptions (zh / en) ────────────────────────────────────────────────

export const PERMISSION_DESCRIPTIONS: Readonly<Record<PluginPermission, { zh: string; en: string }>> = {
  'file.read':       { zh: '读取文件内容',       en: 'Read file contents' },
  'file.write':      { zh: '写入文件内容',       en: 'Write file contents' },
  'file.watch':      { zh: '监听文件变更',       en: 'Watch file changes' },
  'sidebar.panel':   { zh: '注册侧边栏面板',     en: 'Register sidebar panel' },
  'statusbar.item':  { zh: '添加状态栏项目',     en: 'Add status bar item' },
  'contextmenu.item':{ zh: '添加右键菜单项',     en: 'Add context menu item' },
  'editor.read':     { zh: '读取编辑器内容',     en: 'Read editor content' },
  'editor.write':    { zh: '修改编辑器内容',     en: 'Write editor content' },
  'editor.decorate': { zh: '添加编辑器装饰',     en: 'Add editor decorations' },
  'editor.extend':   { zh: '注册编辑器扩展',     en: 'Register editor extension' },
  'workspace':       { zh: '访问工作区',         en: 'Access workspace' },
  'preview.extend':  { zh: '扩展预览渲染',       en: 'Extend preview rendering' },
  'settings.section':{ zh: '注册设置页面',       en: 'Register settings section' },
  'theme':           { zh: '注册自定义主题',     en: 'Register custom theme' },
  'export':          { zh: '注册导出器',         en: 'Register exporter' },
  'ui.message':      { zh: '显示 UI 消息',       en: 'Show UI messages' },
  'storage':         { zh: '访问插件存储',       en: 'Access plugin storage' },
  'commands':        { zh: '注册命令',           en: 'Register commands' },
  'shell.execute':   { zh: '执行Shell命令（受限白名单）', en: 'Execute shell commands (whitelist only)' },
  'git.command':     { zh: '执行Git命令',        en: 'Execute Git commands' },
  'tauri.raw':       { zh: '调用 Tauri 原始 API（不推荐）', en: 'Call Tauri raw API (deprecated)' },
};

// ── Dangerous permissions ──────────────────────────────────────────────────

export const DANGEROUS_PERMISSIONS: readonly PluginPermission[] = [
  'shell.execute', 'git.command', 'tauri.raw', 'file.write'
];

/** Check whether a permission is considered dangerous. */
export function isDangerous(permission: PluginPermission): boolean {
  return DANGEROUS_PERMISSIONS.includes(permission);
}
