import { useEffect, useRef, MutableRefObject } from 'react';
import { ViewMode, FocusMode } from '../types';
import {
  getCustomShortcuts,
  parseShortcut,
  eventMatchesShortcut,
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
}

/** 默认快捷键映射：actionId → 解析后的快捷键 */
const DEFAULT_PARSED = new Map([
  ['newTab', { ctrl: true, shift: false, alt: false, key: 'n' }],
  ['openFile', { ctrl: true, shift: false, alt: false, key: 'o' }],
  ['saveFile', { ctrl: true, shift: false, alt: false, key: 's' }],
  ['saveAsFile', { ctrl: true, shift: true, alt: false, key: 's' }],
  ['closeTab', { ctrl: true, shift: false, alt: false, key: 'w' }],
  ['findReplace', { ctrl: true, shift: false, alt: false, key: 'f' }],
  ['editMode', { ctrl: true, shift: false, alt: false, key: '1' }],
  ['splitMode', { ctrl: true, shift: false, alt: false, key: '2' }],
  ['previewMode', { ctrl: true, shift: false, alt: false, key: '3' }],
  ['typewriterMode', { ctrl: true, shift: false, alt: false, key: '.' }],
  ['focusMode', { ctrl: true, shift: false, alt: false, key: ',' }],
  ['insertSnippet', { ctrl: true, shift: true, alt: false, key: 'j' }],
  ['toggleFileTree', { ctrl: false, shift: false, alt: true, key: '1' }],
  ['toggleToc', { ctrl: false, shift: false, alt: true, key: '2' }],
]);

export function useKeyboardShortcuts(params: ShortcutsParams) {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const custom = getCustomShortcuts();

    const handler = (e: KeyboardEvent) => {
      const { createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile, closeTab, setViewMode, activeTabIdRef, toggleFindReplace, setFocusMode, focusMode, openSnippetPicker, toggleFileTree, toggleToc } = paramsRef.current;
      
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

      // 检查 Ctrl/Cmd 键
      if (!(e.ctrlKey || e.metaKey)) return;

      // 尝试匹配用户自定义快捷键或默认快捷键
      for (const [actionId, defaultSc] of DEFAULT_PARSED) {
        const keys = custom[actionId];
        const parsed = keys ? parseShortcut(keys) : defaultSc;
        if (eventMatchesShortcut(e, parsed)) {
          e.preventDefault();
          switch (actionId) {
            case 'newTab': createNewTab(); break;
            case 'openFile': handleOpenFile(); break;
            case 'saveFile': handleSaveFile(); break;
            case 'saveAsFile': handleSaveAsFile(); break;
            case 'closeTab': closeTab(activeTabIdRef.current); break;
            case 'findReplace': case 'findReplaceAlt':
              toggleFindReplace?.(); break;
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
          }
          return; // 匹配成功，停止继续检查
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
