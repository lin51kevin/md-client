/**
 * 快捷键配置管理模块
 * 支持用户自定义快捷键，持久化到 localStorage
 */

export interface ShortcutAction {
  id: string;
  labelKey: string;
  defaultKeys: string;
}

/** 所有可自定义的快捷键 */
export const DEFAULT_SHORTCUTS: ShortcutAction[] = [
  { id: 'newTab', labelKey: 'settings.shortcuts.newTab', defaultKeys: 'Ctrl+N' },
  { id: 'openFile', labelKey: 'settings.shortcuts.openFile', defaultKeys: 'Ctrl+O' },
  { id: 'saveFile', labelKey: 'settings.shortcuts.saveFile', defaultKeys: 'Ctrl+S' },
  { id: 'saveAsFile', labelKey: 'settings.shortcuts.saveAsFile', defaultKeys: 'Ctrl+Shift+S' },
  { id: 'closeTab', labelKey: 'settings.shortcuts.closeTab', defaultKeys: 'Ctrl+W' },
  { id: 'findReplace', labelKey: 'settings.shortcuts.findReplace', defaultKeys: 'Ctrl+F' },
  { id: 'editMode', labelKey: 'settings.shortcuts.editMode', defaultKeys: 'Ctrl+1' },
  { id: 'splitMode', labelKey: 'settings.shortcuts.splitMode', defaultKeys: 'Ctrl+2' },
  { id: 'previewMode', labelKey: 'settings.shortcuts.previewMode', defaultKeys: 'Ctrl+3' },
  { id: 'slideMode', labelKey: 'settings.shortcuts.slideMode', defaultKeys: 'Ctrl+4' },
  { id: 'typewriterMode', labelKey: 'settings.shortcuts.typewriterMode', defaultKeys: 'Ctrl+.' },
  { id: 'focusMode', labelKey: 'settings.shortcuts.focusMode', defaultKeys: 'Ctrl+,' },
  { id: 'insertSnippet', labelKey: 'settings.shortcuts.insertSnippet', defaultKeys: 'Ctrl+Shift+J' },
  // Multi-cursor
  { id: 'multicursor.selectAllOccurrences', labelKey: 'settings.shortcuts.selectAllOccurrences', defaultKeys: 'Alt+D' },
  { id: 'multicursor.addCursorAbove', labelKey: 'settings.shortcuts.addCursorAbove', defaultKeys: 'Alt+Up' },
  { id: 'multicursor.addCursorBelow', labelKey: 'settings.shortcuts.addCursorBelow', defaultKeys: 'Alt+Down' },
];

const STORAGE_KEY = 'marklite-custom-shortcuts';

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
