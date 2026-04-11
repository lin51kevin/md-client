import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, lazy, Suspense } from 'react';
import type { Extension } from '@codemirror/state';
import CodeMirror, { type EditorState, type ViewUpdate } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { foldGutter } from '@codemirror/language';
import Split from 'react-split';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import { X } from 'lucide-react';
import './App.css';

import { I18nContext, useI18nProvider } from './i18n';
import { ViewMode } from './types';
import { useTabs } from './hooks/useTabs';
import { useFileOps } from './hooks/useFileOps';
import { useScrollSync } from './hooks/useScrollSync';
import { useDragDrop } from './hooks/useDragDrop';
import { useWindowTitle } from './hooks/useWindowTitle';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCursorPosition } from './hooks/useCursorPosition';
import { useFocusMode } from './hooks/useFocusMode';
import { useLocalStorageBool } from './hooks/useLocalStorage';
import { useWelcome } from './hooks/useWelcome';
import { useEditorContextActions } from './hooks/useEditorContextActions';
import { extractToc, type TocEntry } from './lib/toc';
import { applyTheme, getSavedTheme, saveTheme, THEMES, type ThemeName } from './lib/theme';
import { sepiaCmTheme, highContrastCmTheme } from './lib/cm-themes';
import { getSnapshots, createSnapshot as createVersionSnapshot, restoreSnapshot } from './lib/version-history';
import { getRecentFiles, clearRecentFiles, type RecentFile } from './lib/recent-files';
import { autoCloseBrackets } from './lib/cmAutocomplete';
import { multicursorKeymap } from './lib/multicursor-keymap';
import { countWords } from './lib/word-count';
import { vimKeymap } from './lib/cmVim';
import { createAutoSave } from './lib/auto-save';
import { getSavedSplitSizes, saveSplitSizes } from './lib/split-preference';

/** Stable config - defined outside component to avoid object churn on every render */
const EDITOR_SETUP = { lineNumbers: true, foldGutter: true, highlightActiveLine: true, tabSize: 2 };
import { Toolbar } from './components/Toolbar';
import { TabBar } from './components/TabBar';
import { TabContextMenu } from './components/TabContextMenu';
import { EditorContextMenu } from './components/EditorContextMenu';
import { detectContext } from './lib/context-menu';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { DragOverlay } from './components/DragOverlay';
const MarkdownPreview = lazy(() =>
  import('./components/MarkdownPreview').then((m) => ({ default: m.MarkdownPreview }))
);
import { SearchPanel, type SearchResultItem } from './components/SearchPanel';
import { TocSidebar } from './components/TocSidebar';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { useSearchHighlight } from './hooks/useSearchHighlight';
import { useImagePaste } from './hooks/useImagePaste';
import { useFormatActions } from './hooks/useFormatActions';
import { parseTable, type TableData } from './lib/table-parser';
import { TableEditor } from './components/TableEditor';
import { InputDialog, type InputDialogConfig } from './components/InputDialog';
import { WelcomePage, EmptyEditorState } from './components/WelcomePage';
import { CommandPalette } from './components/CommandPalette';
import { SnippetPicker } from './components/SnippetPicker';
import { SnippetManager } from './components/SnippetManager';
import type { Command } from './lib/commands';


export default function App() {
  const i18n = useI18nProvider();
  const { t } = i18n;


  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  // F014 — 编辑器右键上下文菜单
  const [editorCtxMenu, setEditorCtxMenu] = useState<{ x: number; y: number; context: import('./lib/context-menu').ContextInfo } | null>(null);
  // F014 — 表格编辑状态
  const [editingTable, setEditingTable] = useState<TableData | null>(null);

  // F009 - 焦点模式
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();

  // F010 - 大纲导航
  const [showToc, setShowToc] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);

  // F014 - 文件树侧边栏
  const [showFileTree, setShowFileTree] = useState(false);

  // F013 - 拼写检查（持久化）
  const [spellCheck, setSpellCheck] = useLocalStorageBool('marklite-spellcheck', true);
  // F014 - Vim 模式（持久化）
  const [vimMode, setVimMode] = useLocalStorageBool('marklite-vimmode', false);
  // F015 - 设置面板
  const [showSettings, setShowSettings] = useState(false);

  // 命令面板 (Ctrl+Shift+P)
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // 片段选择器
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [showSnippetManager, setShowSnippetManager] = useState(false);

  // F011 - 主题系统
  const [theme, setThemeState] = useState<ThemeName>(() => getSavedTheme() || 'light');

  // 欢迎页状态（持久化）
  const { welcomeDismissed, handleDismissWelcome, handleShowWelcome } = useWelcome();


  // F012 - 版本历史
  const [snapshots, setSnapshots] = useState<import('./lib/version-history').Snapshot[]>([]);


  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef,
    getActiveTab, getTabTitle, updateActiveDoc, updateTabDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, reorderTabs,
    markSaved, markSavedAs,
    renameTab, setTabDisplayName,
    pinTab, unpinTab,
  } = useTabs(t);

  // True when only the initial backing tab exists untouched — welcome/empty state
  const isPristine = tabs.length === 1 && !tabs[0].filePath && !tabs[0].isDirty && !tabs[0].displayName;

  // Opens the DEFAULT_MARKDOWN content as an editable "sample.md" tab
  const handleOpenSample = useCallback(() => {
    setTabDisplayName(tabs[0].id, 'sample.md');
    handleDismissWelcome();
  }, [tabs, setTabDisplayName, handleDismissWelcome]);

  // F013 - Tab 重命名状态
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);

  // F013 — 最近文件状态
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(getRecentFiles());

  // F013 — 分栏比例记忆
  const [splitSizes, setSplitSizes] = useState<[number, number]>(() => getSavedSplitSizes());

  // 每次打开文件成功后刷新最近列表(通过 activeTabId 变化感知)
  const handleOpenRecent = useCallback(async (filePath: string) => {
    await openFileInTab(filePath);
    setRecentFiles(getRecentFiles());
  }, [openFileInTab]);

  const handleClearRecent = useCallback(() => {
    clearRecentFiles();
    setRecentFiles([]);
  }, []);

  // [B1 FIX] Wiki-link navigation: resolve [[target]] → open existing file or offer to create
  const handleWikiLinkNavigate = useCallback(async (target: string) => {
    // Determine the current file's directory to search for the linked document
    const currentDir = getActiveTab()?.filePath?.replace(/[/\\][^/\\]+$/, '') ?? '';
    // Try potential filenames: exact match, then .md extension
    const candidates = [`${target}.md`, target];
    for (const name of candidates) {
      const candidatePath = currentDir ? `${currentDir}/${name}` : name;
      try {
        await invoke<string>('read_file_text', { path: candidatePath });
        // File exists — open it in a new tab
        await openFileInTab(candidatePath);
        return;
      } catch {
        // Not found — try next candidate
      }
    }
    // None found — offer to create a new document
    const filename = `${target}.md`;
    const yes = await confirm(
      `文档 "${target}" 未找到，是否创建？`,
      { title: t('wiki.create', { name: target }), kind: 'warning' }
    );
    if (yes) {
      const newPath = currentDir ? `${currentDir}/${filename}` : filename;
      try {
        await invoke('create_file', { path: newPath });
        await openFileInTab(newPath);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        await message(errMsg, { title: t('fileOps.error'), kind: 'error' });
      }
    }
  }, [getActiveTab, openFileInTab, t]);

  // F001 - 关闭有未保存内容的标签页时弹出确认
  // F013 - 固定标签需先解除固定才能关闭(强制关闭由右键菜单单独处理)
  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isPinned) return; // pinned tabs cannot be normally closed
    if (tab?.isDirty) {
      const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
      const path = tab.filePath ?? t('app.unsavedPath');
      const yes = await confirm(
        t('app.closeTabUnsaved', { name, path }),
        { title: t('app.closeTab'), kind: 'warning' }
      );
      if (!yes) return;
    }
    closeTab(id);
  }, [tabs, closeTab]);

  // 关闭所有非固定标签页
  const handleCloseAllTabs = useCallback(async () => {
    const unpinnedTabs = tabs.filter(t => !t.isPinned);
    for (const tab of unpinnedTabs) {
      if (tab.isDirty) {
        const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
        const path = tab.filePath ?? t('app.unsavedPath');
        const yes = await confirm(
          t('app.closeTabUnsaved', { name, path }),
          { title: t('app.closeTab'), kind: 'warning' }
        );
        if (!yes) return;
      }
    }
    for (const tab of unpinnedTabs) {
      closeTab(tab.id);
    }
  }, [tabs, closeTab, t]);

  const { handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml, handleExportEpub, handleExportPng, exporting } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs, t,
  });

  // F012 - 包装保存函数,保存成功后创建快照(仅手动 Ctrl+S 触发)
  const handleSaveFile = useCallback(async (tabId?: string) => {
    await rawHandleSaveFile(tabId);
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (tab?.filePath) {
      const updated = createVersionSnapshot(tab.filePath, tab.doc);
      setSnapshots(updated);
    }
  }, [rawHandleSaveFile, tabs, getActiveTab]);

  const { editorRef, previewRef, handleEditorScroll, handlePreviewScroll } = useScrollSync(viewMode);
  const { cursorPos, cursorExtension } = useCursorPosition();

  // Multi-cursor: track cursor/range count from EditorView
  const [cursorCount, setCursorCount] = useState(1);
  const { searchHighlightExtension, setMatches, clearMatches } = useSearchHighlight();

  // Per-tab EditorState persistence: declared early so all callbacks can close over it
  const cmViewRef = useRef<EditorView | null>(null);

  // F014 — 工具栏格式化操作处理器
  // InputDialog 状态：替代 window.prompt
  const [inputDialogState, setInputDialogState] = useState<{
    config: InputDialogConfig;
    resolve: (value: string | null) => void;
  } | null>(null);

  const promptUser = useCallback((config: InputDialogConfig): Promise<string | null> => {
    return new Promise((resolve) => {
      setInputDialogState({ config, resolve });
    });
  }, []);

  const { handleFormatAction } = useFormatActions({ cmViewRef, getActiveTab, promptUser });

  // F014 — 图片粘贴/拖拽插入
  const insertImageMarkdown = useCallback((markdown: string) => {
    const view = cmViewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: markdown },
      selection: { anchor: pos + markdown.length },
    });
    view.focus();
  }, []);

  // 片段插入处理：将解析后的片段文本插入编辑器光标位置
  const handleSnippetInsert = useCallback((_snippetId: string, resolved: { text: string; cursorPosition: number | null }) => {
    const view = cmViewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: resolved.text },
      selection: { anchor: resolved.cursorPosition !== null ? pos + resolved.cursorPosition : pos + resolved.text.length },
    });
    updateActiveDoc(resolved.text);
    view.focus();
  }, [updateActiveDoc]);

  // Open file passed via CLI argument (e.g. double-clicked from file explorer)
  useEffect(() => {
    if (!isTauri) return;
    invoke<{ path: string; content: string } | null>('get_open_file').then((result) => {
      if (result) openFileWithContent(result.path, result.content);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = getActiveTab();
  useWindowTitle(activeTab, isTauri);

  const { saveAndInsert: saveAndInsertImage } = useImagePaste({
    docPath: activeTab.filePath,
    insertText: insertImageMarkdown,
    enabled: true,
    isTauri,
  });

  useDragDrop({ isTauri, setIsDragOver, openFileInTab, onImageDrop: saveAndInsertImage });

  // F011 - 主题切换: useLayoutEffect 在浏览器绘制前同步应用 CSS 变量，避免主题切换/模式切换时的短暂色彩不一致
  useLayoutEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // 同步原生标题栏主题(Windows/macOS) — 异步操作，保持 useEffect
  // Tauri setTheme only accepts 'light' | 'dark' | null; map non-standard themes
  useEffect(() => {
    if (isTauri) {
      const nativeTheme = THEMES[theme].isDark ? 'dark' as const : 'light' as const;
      getCurrentWindow().setTheme(nativeTheme).catch(() => {});
    }
  }, [theme, isTauri]);

  // F012 - 切换文件时加载对应快照列表
  useEffect(() => {
    if (activeTab.filePath) {
      setSnapshots(getSnapshots(activeTab.filePath));
    } else {
      setSnapshots([]);
    }
  }, [activeTab.filePath]);

  // F010 - TOC 数据 + 跳转处理
  // 防抖 300ms 延迟更新 toc/wordCount,避免每次按键都重算
  const [debouncedDoc, setDebouncedDoc] = useState(activeTab.doc);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedDoc(activeTab.doc), 300);
    return () => clearTimeout(id);
  // activeTabId 切换时立即同步,避免旧标签页数据延迟显示
  }, [activeTab.doc, activeTabId]);

  const tocEntries = useMemo(() => extractToc(debouncedDoc), [debouncedDoc]);
  const wordCount = useMemo(() => countWords(debouncedDoc).words, [debouncedDoc]);
  const handleTocNavigate = useCallback((entry: TocEntry) => {
    setActiveTocId(entry.id);

    // Scroll editor to heading line
    const view = cmViewRef.current;
    if (view) {
      const pos = Math.min(entry.position, view.state.doc.length);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 40 }),
      });
    }

    // Scroll preview to heading (use scrollTop to avoid layout shift)
    const previewEl = previewRef.current;
    if (previewEl) {
      // First: try by id (works for plain headings)
      const heading = previewEl.querySelector(`[id="${CSS.escape(entry.id)}"]`) as HTMLElement | null;
      if (heading) {
        const containerRect = previewEl.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const offset = headingRect.top - containerRect.top + previewEl.scrollTop;
        previewEl.scrollTo({ top: Math.max(0, offset - 40), behavior: 'smooth' });
      } else {
        // Fallback: proportional scroll based on character position
        const docLen = activeTab.doc.length;
        const ratio = docLen > 0 ? entry.position / docLen : 0;
        const maxScroll = previewEl.scrollHeight - previewEl.clientHeight;
        previewEl.scrollTo({ top: Math.max(0, ratio * maxScroll - 40), behavior: 'smooth' });
      }
    }
  }, [previewRef, activeTab.doc]);

  // 搜索结果点击 → 如果是当前文件直接定位，否则打开对应标签页再定位
  const handleSearchResultClick = useCallback(async (result: SearchResultItem) => {
    // Untitled in-memory tab identified by tab_id
    if (result.tab_id) {
      const isSameTab = result.tab_id === activeTabId;
      if (!isSameTab) setActiveTabId(result.tab_id);
      setTimeout(() => {
        const view = cmViewRef.current;
        if (view) {
          const lineNum = Math.max(0, result.line_number - 1);
          const lineInfo = view.state.doc.line(lineNum + 1);
          const anchor = lineInfo.from + result.match_start;
          const head = lineInfo.from + result.match_end;
          view.dispatch({
            selection: { anchor, head },
            effects: EditorView.scrollIntoView(anchor, { y: 'center', yMargin: 40 }),
          });
          view.focus();
        }
      }, isSameTab ? 0 : 200);
      return;
    }
    // 当前文件搜索时 file_path 为空字符串（未保存）或与当前路径相同，均视为当前文件
    const isCurrentFile = !result.file_path || result.file_path === activeTab.filePath;
    if (!isCurrentFile) {
      await openFileInTab(result.file_path);
    }
    setTimeout(() => {
      const view = cmViewRef.current;
      if (view) {
        const lineNum = Math.max(0, result.line_number - 1);
        const lineInfo = view.state.doc.line(lineNum + 1);
        const anchor = lineInfo.from + result.match_start;
        const head = lineInfo.from + result.match_end;
        view.dispatch({
          selection: { anchor, head },
          effects: EditorView.scrollIntoView(anchor, { y: 'center', yMargin: 40 }),
        });
        view.focus();
      }
    }, isCurrentFile ? 0 : 200);
  }, [openFileInTab, activeTab.filePath, activeTabId, setActiveTabId]);

  // F014 — 编辑器右键菜单: 使用 ref 保存最新文档内容供 handleCreateEditor 中的监听器读取
  const docRef = useRef(activeTab.doc);
  useEffect(() => { docRef.current = activeTab.doc; }, [activeTab.doc]);

  // F014 — 用 state 跟踪当前活跃 EditorView，确保 viewMode 切换/welcome 页消失等场景
  // 也能触发 useEffect 重新绑定监听器（单纯用 ref 不会触发 effect 重跑）
  const [activeEditorView, setActiveEditorView] = useState<EditorView | null>(null);

  // F014 — 编辑器右键菜单操作处理（提取为独立 hook）
  const { handleEditorCtxAction: _handleEditorCtxAction } = useEditorContextActions({
    cmViewRef,
    handleFormatAction,
    setEditingTable,
    setEditorCtxMenu,
  });

  // 包装：拦截 insertSnippet 动作，显示片段选择器
  const handleEditorCtxAction = useCallback((action: string) => {
    if (action === 'insertSnippet') {
      setEditorCtxMenu(null);
      setShowSnippetPicker(true);
      return;
    }
    _handleEditorCtxAction(action);
  }, [_handleEditorCtxAction, setEditorCtxMenu, setShowSnippetPicker]);

  useKeyboardShortcuts({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    closeTab: handleCloseTab, setViewMode, activeTabIdRef,
    toggleFindReplace: () => { setShowSearchPanel(prev => !prev); },
    focusMode, setFocusMode,
  });

  // ── Command Palette: Ctrl+Shift+P (not inside input fields) ──
  const commandRegistry = useMemo<Command[]>(() => [
    // 文件
    { id: 'file.new', label: '新建标签页', labelEn: 'New Tab', shortcut: 'Ctrl+N', category: 'file', action: () => createNewTab() },
    { id: 'file.open', label: '打开文件', labelEn: 'Open File', shortcut: 'Ctrl+O', category: 'file', action: () => handleOpenFile() },
    { id: 'file.save', label: '保存', labelEn: 'Save', shortcut: 'Ctrl+S', category: 'file', action: () => handleSaveFile() },
    { id: 'file.saveAs', label: '另存为', labelEn: 'Save As', shortcut: 'Ctrl+Shift+S', category: 'file', action: () => handleSaveAsFile() },
    // 编辑
    { id: 'edit.find', label: '查找', labelEn: 'Find', shortcut: 'Ctrl+F', category: 'edit', action: () => setShowSearchPanel(prev => !prev) },
    { id: 'edit.replace', label: '查找替换', labelEn: 'Find & Replace', shortcut: 'Ctrl+H', category: 'edit', action: () => setShowSearchPanel(prev => !prev) },
    { id: 'edit.undo', label: '撤销', labelEn: 'Undo', shortcut: 'Ctrl+Z', category: 'edit', action: () => { if (cmViewRef.current) undo(cmViewRef.current); } },
    { id: 'edit.redo', label: '重做', labelEn: 'Redo', shortcut: 'Ctrl+Y', category: 'edit', action: () => { if (cmViewRef.current) redo(cmViewRef.current); } },
    // 视图
    { id: 'view.editOnly', label: '仅编辑器', labelEn: 'Editor Only', shortcut: 'Ctrl+1', category: 'view', action: () => setViewMode('edit') },
    { id: 'view.split', label: '分栏预览', labelEn: 'Split Preview', shortcut: 'Ctrl+2', category: 'view', action: () => setViewMode('split') },
    { id: 'view.previewOnly', label: '仅预览', labelEn: 'Preview Only', shortcut: 'Ctrl+3', category: 'view', action: () => setViewMode('preview') },
    { id: 'view.focusTypewriter', label: '打字机模式', labelEn: 'Typewriter Mode', shortcut: 'Ctrl+.', category: 'view', action: () => setFocusMode(focusMode === 'typewriter' ? 'normal' : 'typewriter') },
    { id: 'view.focusMode', label: '专注模式', labelEn: 'Focus Mode', shortcut: 'Ctrl+,', category: 'view', action: () => setFocusMode(focusMode === 'focus' ? 'normal' : 'focus') },
    { id: 'view.fullscreen', label: '全屏模式', labelEn: 'Fullscreen', shortcut: 'F11', category: 'view', action: async () => {
      if (!isTauri) return;
      try { const { getCurrentWindow } = await import('@tauri-apps/api/window'); const w = getCurrentWindow(); w.isFullscreen().then(fs => w.setFullscreen(!fs)); }
      catch {} /* ignore */
    }},
    // 格式化
    { id: 'format.bold', label: '加粗', labelEn: 'Bold', shortcut: 'Ctrl+B', category: 'format', action: () => handleFormatAction('bold') },
    { id: 'format.italic', label: '斜体', labelEn: 'Italic', shortcut: 'Ctrl+I', category: 'format', action: () => handleFormatAction('italic') },
    { id: 'format.strikethrough', label: '删除线', labelEn: 'Strikethrough', shortcut: '', category: 'format', action: () => handleFormatAction('strikethrough') },
    { id: 'format.code', label: '行内代码', labelEn: 'Inline Code', shortcut: 'Ctrl+`', category: 'format', action: () => handleFormatAction('code') },
    { id: 'format.link', label: '插入链接', labelEn: 'Insert Link', shortcut: 'Ctrl+K', category: 'format', action: () => handleFormatAction('link') },
    { id: 'format.image', label: '插入图片', labelEn: 'Insert Image', shortcut: '', category: 'format', action: () => handleFormatAction('image-local') },
    // 导出
    { id: 'export.docx', label: '导出 Word', labelEn: 'Export Word', shortcut: '', category: 'export', action: () => handleExportDocx() },
    { id: 'export.pdf', label: '导出 PDF', labelEn: 'Export PDF', shortcut: '', category: 'export', action: () => handleExportPdf() },
    { id: 'export.html', label: '导出 HTML', labelEn: 'Export HTML', shortcut: '', category: 'export', action: () => handleExportHtml() },
    { id: 'export.png', label: '导出 PNG', labelEn: 'Export PNG', shortcut: '', category: 'export', action: () => handleExportPng(previewRef.current) },
    // 片段
    { id: 'snippet.insert', label: '插入片段', labelEn: 'Insert Snippet', shortcut: '', category: 'custom', action: () => setShowSnippetPicker(true) },
    { id: 'snippet.manager', label: '片段管理', labelEn: 'Snippet Manager', shortcut: '', category: 'custom', action: () => setShowSnippetManager(true) },
  ], [createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile, setViewMode, focusMode, setFocusMode, handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml, previewRef.current, setShowSnippetPicker, setShowSnippetManager]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in input/textarea/editor
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowCommandPalette(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Per-tab EditorState persistence: preserves cursor position and undo history.
  // themeKey is stored alongside the state so we can detect stale theme configs on restore.
  const savedStatesRef = useRef<Map<string, { state: EditorState; themeKey: string }>>(new Map());

  const handleCreateEditor = useCallback((view: EditorView) => {
    cmViewRef.current = view;
    setActiveEditorView(view); // 触发 useEffect 重新绑定 contextmenu/dblclick 监听器
    const saved = savedStatesRef.current.get(activeTabId);
    if (saved) {
      if (saved.themeKey === theme) {
        // Same theme: restore full state (cursor, undo history, config)
        view.setState(saved.state);
      } else {
        // Theme changed since this tab was last active: the saved EditorState
        // embeds the old CodeMirror theme extensions. Restoring it via setState
        // would override the current theme and @uiw/react-codemirror's reconfigure
        // effect won't re-fire (theme prop didn't change between renders).
        // Only restore the cursor selection; the new theme config stays intact.
        view.dispatch({ selection: saved.state.selection });
      }
    }
  }, [activeTabId, theme]);

  // F014 — Attach contextmenu + dblclick listeners whenever a new EditorView is created.
  // Depends on activeEditorView state (not just activeTabId) so it also re-runs on:
  //   - viewMode changes (split ↔ edit switches to a different CodeMirror instance)
  //   - WelcomePage dismiss (CodeMirror was hidden, now mounts for the first time)
  useEffect(() => {
    const view = activeEditorView;
    if (!view) return;

    // F014 — 编辑器右键上下文菜单
    const handleCtxMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false);
      if (pos == null) return;
      const sel = view.state.selection.main;
      if (pos < sel.from || pos > sel.to) {
        view.dispatch({ selection: { anchor: pos } });
      }
      const contextInfo = detectContext(docRef.current, pos);
      setEditorCtxMenu({ x: e.clientX, y: e.clientY, context: contextInfo });
    };

    // F014 — 双击表格时打开表格编辑器
    const handleDblClick = (e: MouseEvent) => {
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false);
      if (pos == null) return;
      const doc = view.state.doc.toString();
      const tableData = parseTable(doc, pos);
      if (tableData) {
        e.preventDefault();
        setEditingTable(tableData);
      }
    };

    view.dom.addEventListener('contextmenu', handleCtxMenu, { capture: true });
    view.dom.addEventListener('dblclick', handleDblClick, { capture: true });

    return () => {
      view.dom.removeEventListener('contextmenu', handleCtxMenu, { capture: true });
      view.dom.removeEventListener('dblclick', handleDblClick, { capture: true });
    };
  }, [activeEditorView]);

  // F014 — 表格编辑确认处理
  const handleTableConfirm = useCallback((newTableMarkdown: string) => {
    if (!editingTable) return;
    const view = cmViewRef.current;
    if (!view) return;
    const doc = view.state.doc.toString();
    const newContent =
      doc.slice(0, editingTable.rawStart) +
      newTableMarkdown +
      doc.slice(editingTable.rawEnd);
    view.dispatch({
      changes: { from: editingTable.rawStart, to: editingTable.rawEnd, insert: newTableMarkdown },
    });
    updateActiveDoc(newContent);
    setEditingTable(null);
  }, [editingTable, updateActiveDoc]);

    const handleEditorUpdate = useCallback((viewUpdate: ViewUpdate) => {
    savedStatesRef.current.set(activeTabId, { state: viewUpdate.state, themeKey: theme });
    // Track cursor/range count for status bar
    const rangeCount = viewUpdate.state.selection.ranges.length;
    setCursorCount(rangeCount);
  }, [activeTabId, theme]);

  // Vim extension is loaded asynchronously
  const [vimExtension, setVimExtension] = useState<Extension | null>(null);
  useEffect(() => {
    vimKeymap().then(setVimExtension).catch(console.error);
  }, []);

  // Keep latest save/getActiveTab in refs to avoid stale closures in auto-save
  const handleSaveFileRef = useRef(handleSaveFile);
  const rawHandleSaveFileRef = useRef(rawHandleSaveFile);
  const getActiveTabRef = useRef(getActiveTab);
  useEffect(() => { handleSaveFileRef.current = handleSaveFile; }, [handleSaveFile]);
  useEffect(() => { rawHandleSaveFileRef.current = rawHandleSaveFile; }, [rawHandleSaveFile]);
  useEffect(() => { getActiveTabRef.current = getActiveTab; }, [getActiveTab]);

  // Auto-save: debounce 1s after editing stops
  // 仅写磁盘,不创建快照(快照只由手动 Ctrl+S 产生)
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);
  useEffect(() => {
    autoSaveRef.current = createAutoSave({
      delay: 1000,
      onSave: async () => {
        const tab = getActiveTabRef.current();
        if (tab.filePath) {
          await rawHandleSaveFileRef.current(activeTabId);
        }
      },
    });
    return () => { autoSaveRef.current?.dispose(); };
  }, [activeTabId]); // 每次切换 tab 创建新的 auto-save

  // Trigger auto-save on content change
  useEffect(() => {
    autoSaveRef.current?.schedule(activeTab.doc);
  }, [activeTab.doc, activeTabId]);

  const editorExtensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    foldGutter(),
    cursorExtension,
    autoCloseBrackets(),
    searchHighlightExtension,
    multicursorKeymap(),
    ...(vimMode && vimExtension ? [vimExtension] : []),
  ], [cursorExtension, vimExtension, vimMode, searchHighlightExtension]);

  // [P1 spellcheck] Apply spellcheck directly to contentDOM when the setting
  // changes — avoids the per-keystroke overhead of an updateListener.
  useEffect(() => {
    const dom = cmViewRef.current?.contentDOM;
    if (dom) dom.spellcheck = spellCheck;
  }, [spellCheck]);
  const editorSetup = EDITOR_SETUP;

  // F011 - 解析 CodeMirror 主题（内置字符串或自定义 Extension）
  const editorTheme = useMemo((): 'light' | 'dark' | Extension => {
    const cm = THEMES[theme].cmTheme;
    if (cm === 'sepia') return sepiaCmTheme as unknown as Extension;
    if (cm === 'high-contrast') return highContrastCmTheme as unknown as Extension;
    return cm; // 'light' | 'dark'
  }, [theme]);

  return (
    <I18nContext.Provider value={i18n}>
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      data-theme={theme}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {isDragOver && <DragOverlay />}

      {/* InputDialog — replaces window.prompt for link/image insertion */}
      {inputDialogState && (
        <InputDialog
          visible={true}
          {...inputDialogState.config}
          onConfirm={(value) => {
            inputDialogState.resolve(value);
            setInputDialogState(null);
          }}
          onCancel={() => {
            inputDialogState.resolve(null);
            setInputDialogState(null);
          }}
        />
      )}

      {/* F014 — 编辑器右键上下文菜单（独立于焦点模式,始终可用） */}
      {editorCtxMenu && (
        <EditorContextMenu
          visible={!!editorCtxMenu}
          x={editorCtxMenu.x}
          y={editorCtxMenu.y}
          context={editorCtxMenu.context}
          onClose={() => setEditorCtxMenu(null)}
          onAction={handleEditorCtxAction}
        />
      )}

      {/* F014 — 表格编辑器（独立于焦点模式,始终可用） */}
      {editingTable && (
        <TableEditor
          table={editingTable}
          onConfirm={handleTableConfirm}
          onCancel={() => setEditingTable(null)}
        />
      )}

      {/* F009 - 焦点模式下隐藏工具栏/标签栏/搜索栏 */}
      {!isChromeless && (
        <>
          {ctxMenu && (
            <TabContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              tabId={ctxMenu.tabId}
              onSave={handleSaveFile}
              onSaveAs={handleSaveAsFile}
              onClose={handleCloseTab}
              onRename={(id) => { setCtxMenu(null); setRenamingTabId(id); }}
              onPin={(id) => { pinTab(id); setCtxMenu(null); }}
              onUnpin={(id) => { unpinTab(id); setCtxMenu(null); }}
              tabs={tabs}
              onDismiss={() => setCtxMenu(null)}
              onCloseAll={handleCloseAllTabs}
            />
          )}

          <Toolbar
            viewMode={viewMode}
            focusMode={focusMode}
            showToc={showToc}
            showFileTree={showFileTree}
            onToggleFileTree={() => setShowFileTree(prev => !prev)}
            onNewTab={createNewTab}
            onOpenFile={handleOpenFile}
            onSaveFile={() => handleSaveFile()}
            onSaveAsFile={() => handleSaveAsFile()}
            onExportDocx={handleExportDocx}
            onExportPdf={handleExportPdf}
            onExportHtml={handleExportHtml}
            onExportEpub={handleExportEpub}
            onExportPng={() => handleExportPng(previewRef.current)}
            onSetViewMode={setViewMode}
            onFocusModeChange={setFocusMode}
            onToggleToc={() => setShowToc(prev => !prev)}
            spellCheck={spellCheck}
            onToggleSpellCheck={() => setSpellCheck(!spellCheck)}
            vimMode={vimMode}
            onToggleVimMode={() => setVimMode(!vimMode)}
            recentFiles={recentFiles}
            onOpenRecent={handleOpenRecent}
            onClearRecent={handleClearRecent}
            onCloseAll={handleCloseAllTabs}
            onToggleSearch={() => setShowSearchPanel(prev => !prev)}
            showSearch={showSearchPanel}
            onFormatAction={handleFormatAction}
            onImageLocal={() => handleFormatAction('image-local')}
            onOpenSettings={() => setShowSettings(true)}
            tabs={tabs}
            activeTabId={activeTabId}
            onActivateTab={setActiveTabId}
          />

          <SettingsModal
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            currentTheme={theme}
            onThemeChange={setThemeState}
            spellCheck={spellCheck}
            onSpellCheckChange={setSpellCheck}
            vimMode={vimMode}
            onVimModeChange={setVimMode}
          />

          <TabBar
            tabs={isPristine ? [] : tabs}
            activeTabId={activeTabId}
            onActivate={setActiveTabId}
            onClose={handleCloseTab}
            onNew={createNewTab}
            onReorder={reorderTabs}
            onContextMenu={(x, y, tabId) => setCtxMenu({ x, y, tabId })}
            getTabTitle={getTabTitle}
            renamingTabId={renamingTabId}
            onStartRename={setRenamingTabId}
            onConfirmRename={async (id, name) => { const ok = await renameTab(id, name); if (ok) setRenamingTabId(null); }}
            onCancelRename={() => setRenamingTabId(null)}
            onPin={pinTab}
            onUnpin={unpinTab}
            showWelcomeTab={isPristine && !welcomeDismissed}
            onCloseWelcomeTab={handleDismissWelcome}
            onCloseAll={handleCloseAllTabs}
          />
        </>
      )}

      {/* F014 - 文件树侧边栏 + F010 - 大纲侧边栏 + 主内容区 */}
      <div className="flex-1 overflow-hidden flex">
        <FileTreeSidebar
          visible={showFileTree}
          onFileOpen={(path) => openFileInTab(path)}
          activeFilePath={activeTab.filePath ?? null}
        />
        <TocSidebar
          key={activeTabId}
          toc={tocEntries}
          onNavigate={handleTocNavigate}
          activeId={activeTocId}
          visible={showToc}
        />

        {isPristine ? (
          welcomeDismissed ? (
            <EmptyEditorState onShowWelcome={handleShowWelcome} />
          ) : (
            <WelcomePage
              recentFiles={recentFiles}
              onNew={createNewTab}
              onOpenFile={handleOpenFile}
              onOpenRecent={handleOpenRecent}
              onOpenSample={handleOpenSample}
              onDismiss={handleDismissWelcome}
            />
          )
        ) : viewMode === 'split' ? (
          <Split
            sizes={splitSizes}
            onDragEnd={(sizes) => {
              const [a, b] = sizes as [number, number];
              if (Math.abs(a + b - 100) < 0.5) {
                setSplitSizes([a, b]);
                saveSplitSizes([a, b]);
              }
            }}
            minSize={250}
            expandToMin={false}
            gutterSize={5}
            gutterAlign="center"
            snapOffset={30}
            dragInterval={1}
            direction="horizontal"
            cursor="col-resize"
            className="flex h-full"
            style={{ flex: 1 }}
          >
            <div className="h-full overflow-auto" ref={editorRef} onScroll={handleEditorScroll}>
              <div className="min-h-full">
                <CodeMirror
                  key={activeTabId}
                  value={activeTab.doc}
                  className="text-sm"
                  theme={editorTheme}
                  extensions={editorExtensions}
                  onChange={updateActiveDoc}
                  onCreateEditor={handleCreateEditor}
                  onUpdate={handleEditorUpdate}
                  basicSetup={editorSetup}
                  spellCheck={spellCheck}
                />
              </div>
            </div>
            <div className="h-full overflow-auto border-l" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }} ref={previewRef} onScroll={handlePreviewScroll}>
              <div className="p-8">
                <Suspense fallback={<div className="p-4 text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>正在加载预览引擎...</div>}>
                  <MarkdownPreview content={debouncedDoc} filePath={activeTab.filePath ?? undefined} onOpenFile={openFileInTab} onContentChange={updateActiveDoc} onWikiLinkNavigate={handleWikiLinkNavigate} className={`markdown-preview max-w-full min-h-full ${THEMES[theme].previewClass}`} />
                </Suspense>
              </div>
            </div>
          </Split>
        ) : (
          <div className="flex h-full w-full">
            {viewMode === 'edit' ? (
              <div className="w-full h-full overflow-auto">
                <CodeMirror
                  key={activeTabId}
                  value={activeTab.doc}
                  height="100%"
                  className="h-full text-sm"
                  theme={editorTheme}
                  extensions={editorExtensions}
                  onChange={updateActiveDoc}
                  onCreateEditor={handleCreateEditor}
                  onUpdate={handleEditorUpdate}
                  basicSetup={editorSetup}
                  spellCheck={spellCheck}
                />
              </div>
            ) : (
              <div ref={previewRef} className="w-full h-full overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="p-8">
                  <Suspense fallback={<div className="p-4 text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>正在加载预览引擎...</div>}>
                    <MarkdownPreview content={debouncedDoc} filePath={activeTab.filePath ?? undefined} onOpenFile={openFileInTab} onContentChange={updateActiveDoc} onWikiLinkNavigate={handleWikiLinkNavigate} className={`markdown-preview max-w-full min-h-full ${THEMES[theme].previewClass}`} />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* F009 - 焦点模式下隐藏状态栏 */}
      {!hideStatusBar && (
        <StatusBar
          filePath={activeTab.filePath}
          isDirty={activeTab.isDirty}
          line={cursorPos.line}
          col={cursorPos.col}
          snapshots={snapshots}
          wordCount={wordCount}
          cursorCount={cursorCount}
          onSnapshotRestore={(id) => {
            if (!activeTab.filePath) return;
            const restoredContent = restoreSnapshot(activeTab.filePath, id);
            if (restoredContent !== null) {
              updateActiveDoc(restoredContent);
            }
          }}
        />
      )}

      <SearchPanel
        visible={showSearchPanel}
        content={activeTab.doc}
        currentFilePath={activeTab.filePath ?? null}
        onContentChange={(newContent) => updateActiveDoc(newContent)}
        onMatchChange={setMatches}
        searchDir={(() => {
          if (activeTab.filePath) return activeTab.filePath.replace(/[/\\][^/\\]+$/, '');
          const fallback = tabs.find(t => t.filePath)?.filePath;
          return fallback ? fallback.replace(/[/\\][^/\\]+$/, '') : null;
        })()}
        onResultClick={handleSearchResultClick}
        onClose={() => { clearMatches(); setShowSearchPanel(false); }}
        openTabs={tabs}
        currentTabId={activeTabId}
        onAnyTabContentChange={updateTabDoc}
      />

      {/* 导出进度指示器 */}
      {exporting && (
        <div className="export-loading-indicator">
          <span className="export-spinner" />
          {t('fileOps.exporting', { format: exporting.toUpperCase() })}
        </div>
      )}

      {/* 命令面板 (Ctrl+Shift+P) */}
      <CommandPalette
        visible={showCommandPalette}
        commands={commandRegistry}
        onClose={() => setShowCommandPalette(false)}
        locale={i18n.locale}
      />

      {/* 片段选择器 */}
      <SnippetPicker
        visible={showSnippetPicker}
        onClose={() => setShowSnippetPicker(false)}
        onSelect={handleSnippetInsert}
      />

      {/* 片段管理器（独立窗口） */}
      {showSnippetManager && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[10001]"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowSnippetManager(false)}
        >
          <div
            className="snippet-manager-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="snippet-manager-header">
              <span>{i18n.t('snippet.manager')}</span>
              <button onClick={() => setShowSnippetManager(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="snippet-manager-body">
              <SnippetManager visible={true} />
            </div>
          </div>
        </div>
      )}
    </div>
    </I18nContext.Provider>
  );
}
