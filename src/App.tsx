import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import type { Extension } from '@codemirror/state';
import CodeMirror, { type EditorState, type ViewUpdate } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { foldGutter } from '@codemirror/language';
import Split from 'react-split';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import './App.css';

import { ViewMode } from './types';
import { useTabs } from './hooks/useTabs';
import { useFileOps } from './hooks/useFileOps';
import { useScrollSync } from './hooks/useScrollSync';
import { useDragDrop } from './hooks/useDragDrop';
import { useWindowTitle } from './hooks/useWindowTitle';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCursorPosition } from './hooks/useCursorPosition';
import { useFocusMode } from './hooks/useFocusMode';
import { extractToc, type TocEntry } from './lib/toc';
import { applyTheme, getSavedTheme, saveTheme, THEMES, type ThemeName } from './lib/theme';
import { getSnapshots, createSnapshot as createVersionSnapshot, restoreSnapshot } from './lib/version-history';
import { getRecentFiles, clearRecentFiles, type RecentFile } from './lib/recent-files';
import { autoCloseBrackets } from './lib/cmAutocomplete';
import { countWords } from './lib/word-count';
import { vimKeymap } from './lib/cmVim';
import { createAutoSave } from './lib/auto-save';
import { getSavedSplitSizes, saveSplitSizes } from './lib/split-preference';

/** Stable config - defined outside component to avoid object churn on every render */
const EDITOR_SETUP = { lineNumbers: true, foldGutter: true, highlightActiveLine: true, tabSize: 2 };

// F013: 拼写检查状态(默认开启)
const DEFAULT_SPELL_CHECK = true;

function getSavedSpellCheck(): boolean {
  try {
    const saved = localStorage.getItem('marklite-spellcheck');
    return saved === null ? DEFAULT_SPELL_CHECK : saved === 'true';
  } catch { return DEFAULT_SPELL_CHECK; }
}

function saveSpellCheck(value: boolean): void {
  try {
    localStorage.setItem('marklite-spellcheck', String(value));
  } catch { /* ignore quota errors */ }
}

import { Toolbar } from './components/Toolbar';
import { TabBar } from './components/TabBar';
import { TabContextMenu } from './components/TabContextMenu';
import { EditorContextMenu } from './components/EditorContextMenu';
import { detectContext } from './lib/context-menu';
import { StatusBar } from './components/StatusBar';
import { DragOverlay } from './components/DragOverlay';
const MarkdownPreview = lazy(() =>
  import('./components/MarkdownPreview').then((m) => ({ default: m.MarkdownPreview }))
);
import { SearchPanel, type SearchResultItem } from './components/SearchPanel';
import { TocSidebar } from './components/TocSidebar';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { useSearchHighlight } from './hooks/useSearchHighlight';
import { useImagePaste } from './hooks/useImagePaste';
import { wrapSelection, toggleLinePrefix, insertLink, insertImage, type SelectionInfo, type FormatResult } from './lib/text-format';
import { parseTable, serializeTable } from './lib/table-parser';


export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  // F014 — 编辑器右键上下文菜单
  const [editorCtxMenu, setEditorCtxMenu] = useState<{ x: number; y: number; context: import('./lib/context-menu').ContextInfo } | null>(null);

  // F009 - 焦点模式
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();

  // F010 - 大纲导航
  const [showToc, setShowToc] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);

  // F014 - 文件树侧边栏
  const [showFileTree, setShowFileTree] = useState(false);

  // F013 - 拼写检查
  const [spellCheck, setSpellCheck] = useState<boolean>(getSavedSpellCheck);

  // F011 - 主题系统
  const [theme, setThemeState] = useState<ThemeName>(() => getSavedTheme() || 'light');

  // F012 - 版本历史
  const [snapshots, setSnapshots] = useState<import('./lib/version-history').Snapshot[]>([]);


  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef,
    getActiveTab, getTabTitle, updateActiveDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, reorderTabs,
    markSaved, markSavedAs,
    renameTab,
    pinTab, unpinTab,
  } = useTabs();

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

  // F001 - 关闭有未保存内容的标签页时弹出确认
  // F013 - 固定标签需先解除固定才能关闭(强制关闭由右键菜单单独处理)
  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isPinned) return; // pinned tabs cannot be normally closed
    if (tab?.isDirty) {
      const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
      const path = tab.filePath ?? '(未保存)';
      const yes = await confirm(
        `"${name}" 有未保存的更改,关闭后将丢失这些更改。\n\n路径: ${path}`,
        { title: '关闭标签页', kind: 'warning' }
      );
      if (!yes) return;
    }
    closeTab(id);
  }, [tabs, closeTab]);

  const { handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs,
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
  const { searchHighlightExtension, setMatches, clearMatches } = useSearchHighlight();

  useDragDrop({ isTauri, setIsDragOver, openFileInTab });

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

  // F014 — 工具栏格式化操作处理器
  const handleFormatAction = useCallback((action: string) => {
    const view = cmViewRef.current;
    if (!view) return;

    const sel = view.state.selection.main;
    const docText = view.state.doc.toString();

    switch (action) {
      case 'bold': case 'italic': case 'strikethrough': case 'code': {
        const wrappers: Record<string, string> = {
          bold: '**', italic: '*', strikethrough: '~~', code: '`' };
        const selInfo: SelectionInfo = { text: docText, start: sel.from, end: sel.to };
        const result: FormatResult = wrapSelection(selInfo, wrappers[action]);
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: result.replacement },
          selection: { anchor: sel.from + result.newCursorOffset },
        });
        break;
      }
      case 'heading': case 'blockquote': case 'ul': case 'ol': {
        const prefixes: Record<string, string> = {
          heading: '# ', blockquote: '> ', ul: '- ', ol: '1. ' };
        const lineStart = view.state.doc.lineAt(sel.from).from;
        const lineEnd = view.state.doc.lineAt(sel.from).to;
        const result: FormatResult = toggleLinePrefix(docText, lineStart, prefixes[action]);
        view.dispatch({
          changes: { from: lineStart, to: lineEnd, insert: result.replacement },
          selection: { anchor: lineStart + result.newCursorOffset },
        });
        break;
      }
      case 'link': {
        const url = window.prompt('请输入链接地址：');
        if (url === null) return; // 用户取消
        const selInfo: SelectionInfo = { text: docText, start: sel.from, end: sel.to };
        const result: FormatResult = insertLink(selInfo, url);
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: result.replacement },
          selection: { anchor: sel.from + result.newCursorOffset },
        });
        break;
      }
      case 'image': {
        const src = window.prompt('请输入图片地址或路径：');
        if (src === null) return; // 用户取消
        const selInfo: SelectionInfo = { text: docText, start: sel.from, end: sel.to };
        const result: FormatResult = insertImage(selInfo, src);
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: result.replacement },
          selection: { anchor: sel.from + result.newCursorOffset },
        });
        break;
      }
    }
    view.focus();
  }, []);

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

  useImagePaste({
    docPath: activeTab.filePath,
    insertText: insertImageMarkdown,
    enabled: true,
  });

  // F011 - 主题切换 effect
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
    // 同步原生标题栏主题(Windows/macOS)
    if (isTauri) {
      getCurrentWindow().setTheme(theme).catch(() => {});
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

  // F014 — 编辑器右键菜单事件监听
  useEffect(() => {
    const view = cmViewRef.current;
    if (!view) return;
    const dom = view.dom;
    const handleCtxMenu = (e: MouseEvent) => {
      e.preventDefault();
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (!pos) return;
      const contextInfo = detectContext(activeTab.doc, pos);
      setEditorCtxMenu({ x: e.clientX, y: e.clientY, context: contextInfo });
    };
    dom.addEventListener('contextmenu', handleCtxMenu);
    return () => dom.removeEventListener('contextmenu', handleCtxMenu);
  }, [activeTab.doc]);

  // F014 — 编辑器右键菜单操作处理
  const handleEditorCtxAction = useCallback((action: string) => {
    const view = cmViewRef.current;
    if (!view) return;

    switch (action) {
      case 'cut':
        document.execCommand('cut');
        break;
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
        navigator.clipboard.readText().then(text => {
          if (!text) return;
          const sel = view.state.selection.main;
          view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
        });
        break;
      case 'selectAll':
        view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
        break;
      case 'bold': case 'italic': case 'strikethrough': case 'code':
      case 'heading': case 'blockquote': case 'ul': case 'ol':
      case 'link': case 'image':
        handleFormatAction(action);
        break;
      case 'headingPromote': {
        // Decrease # count (e.g. ## → #)
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text.match(/^(#{1,6})/);
        const level = lineText?.[1]?.length ?? 1;
        if (level > 1) {
          view.dispatch({ changes: { from: line.from, to: line.from + level, insert: '#'.repeat(level - 1) + ' ' } });
        }
        break;
      }
      case 'headingDemote': {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text.match(/^(#{1,6})/);
        const level = lineText?.[1]?.length ?? 0;
        if (level >= 1 && level < 6) {
          view.dispatch({ changes: { from: line.from, to: line.from + level, insert: '#'.repeat(level + 1) + ' ' } });
        } else if (level === 0 || !lineText) {
          // No heading → make H2
          view.dispatch({ changes: { from: line.from, insert: '## ' } });
        }
        break;
      }
      case 'headingRemove': {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const m = line.text.match(/^(#{1,6}\s*)/);
        if (m) {
          view.dispatch({ changes: { from: line.from, to: line.from + m[1].length, insert: '' } });
        }
        break;
      }
      case 'copyCodeBlock': {
        const doc = view.state.doc.toString();
        // Find current code block
        const sel = view.state.selection.main;
        let start = sel.from; let end = sel.to;
        while (start > 0 && doc.substring(start - 3, start) !== '```') start--;
        while (end < doc.length && doc.substring(end, end + 3) !== '```') end++;
        if (start < end && doc.substring(start, start + 3) === '```' && doc.substring(end, end + 3) === '```') {
          const codeContent = doc.substring(start + (doc.indexOf('\n', start) + 1), end).trim();
          navigator.clipboard.writeText(codeContent);
        } else {
          document.execCommand('copy');
        }
        break;
      }
      case 'indent':
        handleFormatAction('ul'); // reuse list toggle as indent proxy
        break;
      case 'outdent':
        // Remove one level of indentation/list prefix
        {
          const sel = view.state.selection.main;
          const line = view.state.doc.lineAt(sel.from);
          const lt = line.text;
          if (/^\s{2}/.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: line.from + 2, insert: '' } });
          } else if (/^[-*+] /.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: line.from + 2, insert: '' } });
          } else if (/^\d+\. /.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: lt.indexOf(' ') + 1, insert: '' } });
          }
        }
        break;
      case 'toggleListType':
        {
          const sel = view.state.selection.main;
          const line = view.state.doc.lineAt(sel.from);
          const lt = line.text;
          if (/^[-*+] /.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: line.from + 2, insert: '1. ' } });
          } else if (/^\d+\. /.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: lt.indexOf('.') + 2, insert: '- ' } });
          }
        }
        break;
      case 'removeBlockquote':
        handleFormatAction('blockquote'); // toggle removes it
        break;
      case 'tableInsertRow': case 'tableDeleteRow':
      case 'tableInsertCol': case 'tableDeleteCol':
      case 'alignLeft': case 'alignCenter': case 'alignRight': {
        const doc = view.state.doc.toString();
        const sel = view.state.selection.main;
        const tableData = parseTable(doc, sel.from);
        if (!tableData) break;

        // Determine data row index: header=line0, separator=line1, data=line2+
        const textBefore = doc.substring(tableData.rawStart, sel.from);
        const cursorLineInTable = textBefore.split('\n').length - 1;
        const rowIdx = Math.max(0, cursorLineInTable - 2);

        // Determine column index from pipe count before cursor
        const cursorLine = view.state.doc.lineAt(sel.from);
        const textBeforeCursor = cursorLine.text.substring(0, sel.from - cursorLine.from);
        const colIdx = Math.max(0, (textBeforeCursor.match(/\|/g) ?? []).length - 1);

        // Immutable copies
        const headers = [tableData.headers[0]?.map(c => c) ?? []];
        let rows = tableData.rows.map(r => [...r]);
        let alignment = [...tableData.alignment];
        const colCount = headers[0].length;

        switch (action) {
          case 'tableInsertRow':
            rows.splice(rowIdx + 1, 0, Array(colCount).fill(''));
            break;
          case 'tableDeleteRow':
            if (rows.length > 1) rows.splice(rowIdx, 1);
            break;
          case 'tableInsertCol':
            headers[0].splice(colIdx + 1, 0, '');
            rows = rows.map(r => { const nr = [...r]; nr.splice(colIdx + 1, 0, ''); return nr; });
            alignment.splice(colIdx + 1, 0, 'left' as const);
            break;
          case 'tableDeleteCol':
            if (headers[0].length > 1) {
              headers[0].splice(colIdx, 1);
              rows = rows.map(r => { const nr = [...r]; nr.splice(colIdx, 1); return nr; });
              alignment.splice(colIdx, 1);
            }
            break;
          case 'alignLeft': alignment[colIdx] = 'left'; break;
          case 'alignCenter': alignment[colIdx] = 'center'; break;
          case 'alignRight': alignment[colIdx] = 'right'; break;
        }

        const newTable = serializeTable({ headers, rows, alignment, rawStart: tableData.rawStart, rawEnd: tableData.rawEnd });
        view.dispatch({ changes: { from: tableData.rawStart, to: tableData.rawEnd - 1, insert: newTable } });
        break;
      }
      case 'copyFormula': {
        const doc = view.state.doc.toString();
        const sel = view.state.selection.main;
        const pos = sel.from;
        // Try enclosing $$ block first
        const blockStart = doc.lastIndexOf('$$', pos - 1);
        const blockEnd = doc.indexOf('$$', pos + 1);
        if (blockStart !== -1 && blockEnd !== -1 && blockStart !== blockEnd) {
          navigator.clipboard.writeText(doc.substring(blockStart + 2, blockEnd).trim());
        } else {
          // Fallback: inline $ formula on current line
          const line = view.state.doc.lineAt(pos);
          const relPos = pos - line.from;
          for (const m of line.text.matchAll(/\$([^$]+)\$/g)) {
            if (m.index !== undefined && m.index <= relPos && m.index + m[0].length >= relPos) {
              navigator.clipboard.writeText(m[1]);
              break;
            }
          }
        }
        break;
      }
      default:
        break;
    }
    setEditorCtxMenu(null);
    view.focus();
  }, [handleFormatAction]);

  useKeyboardShortcuts({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    closeTab: handleCloseTab, setViewMode, activeTabIdRef,
    toggleFindReplace: () => { setShowSearchPanel(prev => !prev); },
    focusMode, setFocusMode,
  });

  // Per-tab EditorState persistence: preserves cursor position and undo history
  const savedStatesRef = useRef<Map<string, EditorState>>(new Map());
  const cmViewRef = useRef<EditorView | null>(null);

  const handleCreateEditor = useCallback((view: EditorView) => {
    cmViewRef.current = view;
    const savedState = savedStatesRef.current.get(activeTabId);
    if (savedState) {
      view.setState(savedState);
    }
  }, [activeTabId]);

  const handleEditorUpdate = useCallback((viewUpdate: ViewUpdate) => {
    savedStatesRef.current.set(activeTabId, viewUpdate.state);
  }, [activeTabId]);

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
    ...(vimExtension ? [vimExtension] : []),
  ], [cursorExtension, vimExtension, searchHighlightExtension]);
  const editorSetup = EDITOR_SETUP;

  // F009 - 根据焦点模式动态调整主题色 (使用当前主题)
  const editorTheme = THEMES[theme].cmTheme;

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      data-theme={theme}
      style={{
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {isDragOver && <DragOverlay />}

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
            />
          )}

          {/* F014 — 编辑器右键上下文菜单 */}
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
            onSetViewMode={setViewMode}
            onFocusModeChange={setFocusMode}
            onToggleToc={() => setShowToc(prev => !prev)}
            currentTheme={theme}
            onThemeChange={setThemeState}
            spellCheck={spellCheck}
            onToggleSpellCheck={() => {
              const next = !spellCheck;
              setSpellCheck(next);
              saveSpellCheck(next);
            }}
            recentFiles={recentFiles}
            onOpenRecent={handleOpenRecent}
            onClearRecent={handleClearRecent}
            onToggleSearch={() => setShowSearchPanel(prev => !prev)}
            showSearch={showSearchPanel}
            onFormatAction={handleFormatAction}
          />

          <TabBar
            tabs={tabs}
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

        {viewMode === 'split' ? (
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
                  <MarkdownPreview content={activeTab.doc} filePath={activeTab.filePath ?? undefined} onOpenFile={openFileInTab} onContentChange={updateActiveDoc} className={`markdown-preview max-w-full min-h-full ${theme === 'dark' ? 'markdown-preview-dark' : ''}`} />
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
                    <MarkdownPreview content={activeTab.doc} filePath={activeTab.filePath ?? undefined} onOpenFile={openFileInTab} onContentChange={updateActiveDoc} className={`markdown-preview max-w-full min-h-full ${theme === 'dark' ? 'markdown-preview-dark' : ''}`} />
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
      />
    </div>
  );
}
