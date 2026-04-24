import { useEffect, useRef, MutableRefObject } from 'react';
import { ViewMode, FocusMode } from '../types';
import { usePreferencesStore } from '../stores/preferences-store';
import {
  getCustomShortcuts,
  parseShortcut,
  eventMatchesShortcut,
  DEFAULT_SHORTCUTS,
  detectConflict,
} from '../lib/editor';

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
  /** 切换搜索面板 */
  toggleSearchPanel?: () => void;
  /** 切换插件面板 */
  togglePluginsPanel?: () => void;
  /** 切换AI面板浮窗 */
  toggleAIPanel?: () => void;
  /** 折叠/展开代码块 */
  toggleCodeBlockFold?: () => void;
  /** 切换到下一个标签页 */
  nextTab?: () => void;
  /** 切换到前一个标签页 */
  previousTab?: () => void;
  /** 关闭所有标签页 */
  closeAllTabs?: () => void;
  /** 打开命令面板 */
  toggleCommandPalette?: () => void;
  /** 打开快速打开 */
  toggleQuickOpen?: () => void;
  /** 在资源管理器中显示当前文件 */
  revealActiveFile?: () => void;
  /** 格式化操作 */
  handleFormatAction?: (action: string) => void;
  /** 全屏切换 */
  toggleFullscreen?: () => void;
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
        toggleFileTree, toggleToc, toggleSearchPanel, togglePluginsPanel,
        toggleAIPanel, toggleCodeBlockFold,
        nextTab, previousTab, closeAllTabs,
        toggleCommandPalette, toggleQuickOpen, revealActiveFile,
        handleFormatAction, toggleFullscreen,
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

      // ── Global shortcuts not in DEFAULT_SHORTCUTS ──────────────
      // (These are handled first as hard-coded, then DEFAULT_SHORTCUTS as user-customizable)

      // 遍历 DEFAULT_SHORTCUTS 检查匹配（用户自定义优先）
      const milkdownPreview = usePreferencesStore.getState().milkdownPreview;
      const WYSIWYG_BLOCKED = new Set(['editMode', 'splitMode', 'previewMode']);

      for (const sc of DEFAULT_SHORTCUTS) {
        const currentKeys = getCurrentShortcut(sc.id);
        if (!currentKeys) continue;
        const parsed = parseShortcut(currentKeys);
        if (!eventMatchesShortcut(e, parsed)) continue;

        // WYSIWYG 模式下跳过视图切换快捷键
        if (milkdownPreview && WYSIWYG_BLOCKED.has(sc.id)) return;

        e.preventDefault();

        switch (sc.id) {
          // ── 文件 ──
          case 'newTab': createNewTab(); break;
          case 'openFile': handleOpenFile(); break;
          case 'saveFile': handleSaveFile(); break;
          case 'saveAsFile': handleSaveAsFile(); break;
          case 'closeTab': closeTab(activeTabIdRef.current); break;
          case 'nextTab': nextTab?.(); break;
          case 'previousTab': previousTab?.(); break;
          case 'closeAllTabs': closeAllTabs?.(); break;

          // ── 编辑 ──
          case 'findReplace': toggleFindReplace?.(); break;
          case 'insertSnippet': openSnippetPicker?.(); break;
          case 'foldCodeBlock': toggleCodeBlockFold?.(); break;

          // ── 格式 ──
          case 'format.bold': handleFormatAction?.('bold'); break;
          case 'format.italic': handleFormatAction?.('italic'); break;
          case 'format.strikethrough': handleFormatAction?.('strikethrough'); break;
          case 'format.code': handleFormatAction?.('code'); break;
          case 'format.link': handleFormatAction?.('link'); break;
          case 'format.image': handleFormatAction?.('image-local'); break;
          case 'format.heading': handleFormatAction?.('heading'); break;
          case 'format.orderedList': handleFormatAction?.('ol'); break;
          case 'format.unorderedList': handleFormatAction?.('ul'); break;
          case 'format.blockquote': handleFormatAction?.('blockquote'); break;
          case 'format.table': handleFormatAction?.('table'); break;
          case 'format.horizontalRule': handleFormatAction?.('hr'); break;

          // ── 视图 ──
          case 'editMode': setViewMode('edit'); break;
          case 'splitMode': setViewMode('split'); break;
          case 'previewMode': setViewMode('preview'); break;
          case 'mindmapMode': setViewMode('mindmap'); break;
          case 'typewriterMode':
            setFocusMode?.(focusMode === 'typewriter' ? 'normal' : 'typewriter'); break;
          case 'focusMode':
            setFocusMode?.(focusMode === 'focus' ? 'normal' : 'focus'); break;
          case 'fullscreen': toggleFullscreen?.(); break;

          // ── 面板 ──
          case 'toggleFileTree': toggleFileTree?.(); break;
          case 'toggleToc': toggleToc?.(); break;
          case 'toggleSearchPanel': toggleSearchPanel?.(); break;
          case 'togglePluginsPanel': togglePluginsPanel?.(); break;

          // ── AI / 工具 ──
          case 'toggleAIPanel': toggleAIPanel?.(); break;
          case 'toggleCommandPalette': toggleCommandPalette?.(); break;
          case 'toggleQuickOpen': toggleQuickOpen?.(); break;
          case 'revealActiveFile': revealActiveFile?.(); break;
        }
        return; // matched — stop processing
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

/** 导出冲突检测供 SettingsModal 使用 */
export { detectConflict };
