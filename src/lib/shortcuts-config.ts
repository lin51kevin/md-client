/**
 * 快捷键配置管理模块
 * 支持用户自定义快捷键，持久化到 localStorage
 */
import type { TranslationKey } from '../i18n/zh-CN';
import { StorageKeys } from './storage-keys';

export type ShortcutCategory = 'file' | 'edit' | 'view' | 'ai';

export interface ShortcutAction {
  id: string;
  labelKey: TranslationKey;
  defaultKeys: string;
  category: ShortcutCategory;
}

/** 所有可自定义的快捷键 */
export const DEFAULT_SHORTCUTS: ShortcutAction[] = [
  { id: 'newTab', labelKey: 'settings.shortcuts.newTab', defaultKeys: 'Ctrl+N', category: 'file' },
  { id: 'openFile', labelKey: 'settings.shortcuts.openFile', defaultKeys: 'Ctrl+O', category: 'file' },
  { id: 'saveFile', labelKey: 'settings.shortcuts.saveFile', defaultKeys: 'Ctrl+S', category: 'file' },
  { id: 'saveAsFile', labelKey: 'settings.shortcuts.saveAsFile', defaultKeys: 'Ctrl+Shift+S', category: 'file' },
  { id: 'closeTab', labelKey: 'settings.shortcuts.closeTab', defaultKeys: 'Ctrl+W', category: 'file' },
  { id: 'nextTab', labelKey: 'settings.shortcuts.nextTab', defaultKeys: 'Ctrl+Tab', category: 'file' },
  { id: 'previousTab', labelKey: 'settings.shortcuts.previousTab', defaultKeys: 'Ctrl+Shift+Tab', category: 'file' },
  { id: 'findReplace', labelKey: 'settings.shortcuts.findReplace', defaultKeys: 'Ctrl+F', category: 'edit' },
  { id: 'editMode', labelKey: 'settings.shortcuts.editMode', defaultKeys: 'Ctrl+1', category: 'view' },
  { id: 'splitMode', labelKey: 'settings.shortcuts.splitMode', defaultKeys: 'Ctrl+2', category: 'view' },
  { id: 'previewMode', labelKey: 'settings.shortcuts.previewMode', defaultKeys: 'Ctrl+3', category: 'view' },
  { id: 'slideMode', labelKey: 'settings.shortcuts.slideMode', defaultKeys: 'Ctrl+4', category: 'view' },
  { id: 'typewriterMode', labelKey: 'settings.shortcuts.typewriterMode', defaultKeys: 'Ctrl+.', category: 'view' },
  { id: 'focusMode', labelKey: 'settings.shortcuts.focusMode', defaultKeys: 'Ctrl+,', category: 'view' },
  { id: 'multicursor.selectAllOccurrences', labelKey: 'settings.shortcuts.selectAllOccurrences', defaultKeys: 'Alt+D', category: 'edit' },
  { id: 'multicursor.addCursorAbove', labelKey: 'settings.shortcuts.addCursorAbove', defaultKeys: 'Alt+Up', category: 'edit' },
  { id: 'multicursor.addCursorBelow', labelKey: 'settings.shortcuts.addCursorBelow', defaultKeys: 'Alt+Down', category: 'edit' },
  { id: 'insertSnippet', labelKey: 'settings.shortcuts.insertSnippet', defaultKeys: 'Ctrl+Shift+J', category: 'edit' },
  { id: 'toggleFileTree', labelKey: 'settings.shortcuts.toggleFileTree', defaultKeys: 'Alt+1', category: 'view' },
  { id: 'toggleToc', labelKey: 'settings.shortcuts.toggleToc', defaultKeys: 'Alt+2', category: 'view' },
  { id: 'toggleAIPanel', labelKey: 'settings.shortcuts.toggleAIPanel', defaultKeys: 'Ctrl+Alt+I', category: 'ai' },
  { id: 'foldCodeBlock', labelKey: 'settings.shortcuts.foldCodeBlock', defaultKeys: 'Ctrl+Shift+.', category: 'edit' },
];

const STORAGE_KEY = StorageKeys.CUSTOM_SHORTCUTS;

export type CustomShortcuts = Record<string, string>;

/** 获取用户自定义快捷键 */
export function getCustomShortcuts(): CustomShortcuts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 保存用户自定义快捷键 */
export function setCustomShortcuts(custom: CustomShortcuts): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

/**
 * 将快捷键字符串（如 'Ctrl+Shift+S'）解析为匹配对象
 * 用于与 KeyboardEvent 比较
 */
export interface ParsedShortcut {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

export function parseShortcut(keys: string): ParsedShortcut {
  const parts = keys.split('+').map(s => s.trim().toLowerCase());
  const parsed: ParsedShortcut = {
    ctrl: parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: '',
  };
  // 最后一个部分是主按键
  const lastPart = parts[parts.length - 1];
  if (!['ctrl', 'cmd', 'shift', 'alt'].includes(lastPart)) {
    parsed.key = lastPart;
  }
  return parsed;
}

/** 检查 KeyboardEvent 是否匹配解析后的快捷键 */
export function eventMatchesShortcut(e: KeyboardEvent, sc: ParsedShortcut): boolean {
  const ctrl = e.ctrlKey || e.metaKey;
  return (
    ctrl === sc.ctrl &&
    e.shiftKey === sc.shift &&
    e.altKey === sc.alt &&
    e.key.toLowerCase() === sc.key.toLowerCase()
  );
}

/** 检测快捷键冲突：返回冲突的 action id，无冲突返回 null */
export function detectConflict(key: string, excludeId: string): string | null {
  const custom = getCustomShortcuts();
  for (const sc of DEFAULT_SHORTCUTS) {
    if (sc.id === excludeId) continue;
    const current = custom[sc.id] || sc.defaultKeys;
    if (current.toLowerCase() === key.toLowerCase()) return sc.id;
  }
  return null;
}

/** 格式化 KeyboardEvent 为快捷键显示字符串 */
export function formatKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  // 排除纯修饰键
  if (e.key && !['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) {
    // 处理特殊键名映射
    const keyMap: Record<string, string> = {
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Enter': 'Return',
      ' ': 'Space',
    };
    parts.push(keyMap[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key));
  }
  return parts.join('+');
}
