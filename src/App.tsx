import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { autoCloseBrackets } from './lib/cmAutocomplete';
import { countWords } from './lib/word-count';
import { vimKeymap } from './lib/cmVim';
import { createAutoSave } from './lib/auto-save';

/** Stable config — defined outside component to avoid object churn on every render */
const EDITOR_SETUP = { lineNumbers: true, foldGutter: true, highlightActiveLine: true, tabSize: 2 };

import { Toolbar } from './components/Toolbar';
import { TabBar } from './components/TabBar';
import { TabContextMenu } from './components/TabContextMenu';
import { StatusBar } from './components/StatusBar';
import { DragOverlay } from './components/DragOverlay';
import { MarkdownPreview } from './components/MarkdownPreview';
import { FindReplaceBar } from './components/FindReplaceBar';
import { TocSidebar } from './components/TocSidebar';
import { useSearchHighlight } from './hooks/useSearchHighlight';


export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  // F009 — 焦点模式
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();

  // F010 — 大纲导航
  const [showToc, setShowToc] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);

  // F011 — 主题系统
  const [theme, setThemeState] = useState<ThemeName>(() => getSavedTheme() || 'light');

  // F012 — 版本历史
  const [snapshots, setSnapshots] = useState<import('./lib/version-history').Snapshot[]>([]);


  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef,
    getActiveTab, getTabTitle, updateActiveDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, reorderTabs,
    markSaved, markSavedAs,
  } = useTabs();

  // F001 — 关闭有未保存内容的标签页时弹出确认
  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isDirty) {
      const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
      const yes = await confirm(`“${name}” 有未保存的更改，确定要关闭吗？`, { title: '关闭标签页', kind: 'warning' });
      if (!yes) return;
    }
    closeTab(id);
  }, [tabs, closeTab]);

  const { handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs,
  });

  // F012 — 包装保存函数，保存成功后创建快照（仅手动 Ctrl+S 触发）
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

  // F011 — 主题切换 effect
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
    // 同步原生标题栏主题（Windows/macOS）
    if (isTauri) {
      getCurrentWindow().setTheme(theme).catch(() => {});
    }
  }, [theme, isTauri]);

  // F012 — 切换文件时加载对应快照列表
  useEffect(() => {
    if (activeTab.filePath) {
      setSnapshots(getSnapshots(activeTab.filePath));
    } else {
      setSnapshots([]);
    }
  }, [activeTab.filePath]);

  // F010 — TOC 数据 + 跳转处理
  // 防抖 300ms 延迟更新 toc/wordCount，避免每次按键都重算
  const [debouncedDoc, setDebouncedDoc] = useState(activeTab.doc);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedDoc(activeTab.doc), 300);
    return () => clearTimeout(id);
  // activeTabId 切换时立即同步，避免旧标签页数据延迟显示
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

  useKeyboardShortcuts({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    closeTab: handleCloseTab, setViewMode, activeTabIdRef,
    toggleFindReplace: () => setShowFindReplace(prev => !prev),
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
  // 仅写磁盘，不创建快照（快照只由手动 Ctrl+S 产生）
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

  // F009 — 根据焦点模式动态调整主题色
  const editorTheme = focusMode === 'focus' ? 'dark' : THEMES[theme].cmTheme;

  return (
    <div
      className={`flex flex-col h-screen w-full overflow-hidden ${
        focusMode === 'focus' ? 'bg-slate-950 text-slate-300' : ''
      }`}
      data-theme={focusMode !== 'focus' ? theme : undefined}
      style={{
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        ...(focusMode !== 'focus' && {
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }),
      }}
    >
      {isDragOver && <DragOverlay />}

      {/* F009 — 焦点模式下隐藏工具栏/标签栏/搜索栏 */}
      {!isChromeless && (
        <>
          {showFindReplace && (
            <FindReplaceBar
              content={activeTab.doc}
              onContentChange={(newContent) => updateActiveDoc(newContent)}
              onClose={() => { clearMatches(); setShowFindReplace(false); }}
              onMatchChange={setMatches}
            />
          )}

          {ctxMenu && (
            <TabContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              tabId={ctxMenu.tabId}
              onSave={handleSaveFile}
              onSaveAs={handleSaveAsFile}
              onClose={handleCloseTab}
              onDismiss={() => setCtxMenu(null)}
            />
          )}

          <Toolbar
            viewMode={viewMode}
            focusMode={focusMode}
            showToc={showToc}
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
          />
        </>
      )}

      {/* F010 — 大纲侧边栏 + 主内容区 */}
      <div className="flex-1 overflow-hidden flex">
        <TocSidebar
          key={activeTabId}
          toc={tocEntries}
          onNavigate={handleTocNavigate}
          activeId={activeTocId}
          visible={showToc}
        />

        {viewMode === 'split' ? (
          <Split
            sizes={[50, 50]}
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
                />
              </div>
            </div>
            <div className={`h-full overflow-auto border-l ${focusMode === 'focus' ? 'border-slate-700 bg-slate-900' : ''}`} style={focusMode !== 'focus' ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' } : undefined} ref={previewRef} onScroll={handlePreviewScroll}>
              <div className="p-8">
                <MarkdownPreview content={activeTab.doc} filePath={activeTab.filePath ?? undefined} onOpenFile={openFileInTab} className={`markdown-preview max-w-200 mx-auto min-h-full ${theme === 'dark' || focusMode === 'focus' ? 'markdown-preview-dark' : ''}`} />
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
                />
              </div>
            ) : (
              <div ref={previewRef} className={`w-full h-full overflow-auto p-8 ${focusMode === 'focus' ? 'bg-slate-900' : ''}`} style={focusMode !== 'focus' ? { backgroundColor: 'var(--bg-primary)' } : undefined}>
                <MarkdownPreview content={activeTab.doc} filePath={activeTab.filePath ?? undefined} onOpenFile={openFileInTab} className={`markdown-preview w-full ${theme === 'dark' || focusMode === 'focus' ? 'markdown-preview-dark' : ''}`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* F009 — 焦点模式下隐藏状态栏 */}
      {!hideStatusBar && (
        <StatusBar
          filePath={activeTab.filePath}
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
    </div>
  );
}
