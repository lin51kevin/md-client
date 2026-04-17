import { useEffect, useRef, MutableRefObject } from 'react';
import { ViewMode, FocusMode } from '../types';
import {
  getCustomShortcuts,
  parseShortcut,
  eventMatchesShortcut,
  DEFAULT_SHORTCUTS,
  detectConflict,
} from '../lib/shortcuts-config';

interface ShortcutsParams {
  createNewTab: () => void;
  handleOpenFile: () => void;
  handleSaveFile: (tabId?: string) => Promise<void>;
  handleSaveAsFile: (tabId?: string) => Promise<void>;
  closeTab: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  activeTabIdRef: MutableRefObject<string>;
  toggleFindReplace?: () => void;
  /** F009 — 焦点模式切换 */
  setFocusMode?: (mode: FocusMode) => void;
  focusMode?: FocusMode;
  /** 插入片段浮窗 */
  openSnippetPicker?: () => void;
  /** 切换文件树侧边栏 */
  toggleFileTree?: () => void;
  /** 切换TOC大纲侧边栏 */
  toggleToc?: () => void;
  /** 切换AI面板浮窗 */
  toggleAIPanel?: () => void;
  /** 折叠/展开代码块 */
  toggleCodeBlockFold?: () => void;
  /** 切换到下一个标签页 */
  nextTab?: () => void;
  /** 切换到前一个标签页 */
  previousTab?: () => void;
  /** 打开命令面板 */
  toggleCommandPalette?: () => void;
  /** 打开快速打开 */
  toggleQuickOpen?: () => void;
  /** 在资源管理器中显示当前文件 */
  revealActiveFile?: () => void;
}

/** 根据 actionId 获取当前快捷键（用户自定义优先） */
function getCurrentShortcut(actionId: string): string {
  const custom = getCustomShortcuts();
  const sc = DEFAULT_SHORTCUTS.find(s => s.id === actionId);
  return custom[actionId] ?? sc?.defaultKeys ?? '';
}

export function useKeyboardShortcuts(params: ShortcutsParams) {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const {
        createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
        closeTab, setViewMode, activeTabIdRef, toggleFindReplace,
        setFocusMode, focusMode, openSnippetPicker,
        toggleFileTree, toggleToc, toggleAIPanel, toggleCodeBlockFold,
        nextTab, previousTab,
        toggleCommandPalette, toggleQuickOpen, revealActiveFile,
      } = paramsRef.current;

      // F009 — ESC 退出任何焦点模式（优先处理，无需 Ctrl）
      if (e.key === 'Escape' && focusMode && focusMode !== 'normal') {
        e.preventDefault();
        setFocusMode?.('normal');
        return;
      }

      // 拦截 F5 / Ctrl+R / Ctrl+Shift+R 等刷新快捷键
      if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r') ||
        (e.ctrlKey && e.shiftKey && e.key === 'R') ||
        (e.ctrlKey && e.key === 'F5')
      ) {
        e.preventDefault();
        return;
      }

      // 拦截 DevTools 快捷键
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'C'].includes(e.key)) {
        e.preventDefault();
        return;
      }

      // 不拦截纯 Alt 组合（Alt+数字切换面板等）
      if (!e.ctrlKey && !e.metaKey && e.altKey) {
        // Allow Alt+1/2 (toggleFileTree/Toc) through to DEFAULT_PARSED
      } else if (!e.ctrlKey && !e.metaKey) {
        // Allow non-modifier keys (but no plain Ctrl/Meta without a target key)
      }

      // ── Global shortcuts not in DEFAULT_SHORTCUTS ──────────────
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault(); toggleCommandPalette?.(); return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault(); toggleQuickOpen?.(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault(); revealActiveFile?.(); return;
      }

      // 遍历 DEFAULT_SHORTCUTS 检查匹配（用户自定义优先）
      for (const sc of DEFAULT_SHORTCUTS) {
        const currentKeys = getCurrentShortcut(sc.id);
        if (!currentKeys) continue;
        const parsed = parseShortcut(currentKeys);
        if (eventMatchesShortcut(e, parsed)) {
          e.preventDefault();
          switch (sc.id) {
            case 'newTab': createNewTab(); break;
            case 'openFile': handleOpenFile(); break;
            case 'saveFile': handleSaveFile(); break;
            case 'saveAsFile': handleSaveAsFile(); break;
            case 'closeTab': closeTab(activeTabIdRef.current); break;
            case 'nextTab': nextTab?.(); break;
            case 'previousTab': previousTab?.(); break;
            case 'findReplace': toggleFindReplace?.(); break;
            case 'editMode': setViewMode('edit'); break;
            case 'splitMode': setViewMode('split'); break;
            case 'previewMode': setViewMode('preview'); break;
            case 'slideMode': setViewMode('slide'); break;
            case 'typewriterMode':
              setFocusMode?.(focusMode === 'typewriter' ? 'normal' : 'typewriter'); break;
            case 'focusMode':
              setFocusMode?.(focusMode === 'focus' ? 'normal' : 'focus'); break;
            case 'insertSnippet': openSnippetPicker?.(); break;
            case 'toggleFileTree': toggleFileTree?.(); break;
            case 'toggleToc': toggleToc?.(); break;
            case 'toggleAIPanel': toggleAIPanel?.(); break;
            case 'foldCodeBlock': toggleCodeBlockFold?.(); break;
          }
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

/** 导出冲突检测供 SettingsModal 使用 */
export { detectConflict };
