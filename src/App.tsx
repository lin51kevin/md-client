import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Extension } from '@codemirror/state';
import CodeMirror, { type EditorState, type ViewUpdate } from '@uiw/react-codemirror';
import { type EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { foldGutter } from '@codemirror/language';
import Split from 'react-split';
import { invoke } from '@tauri-apps/api/core';
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
import { applyTheme, getSavedTheme, saveTheme, type ThemeName } from './lib/theme';
import { getSnapshots, createSnapshot as createVersionSnapshot } from './lib/version-history';
import { autoCloseBrackets } from './lib/cmAutocomplete';
import { vimKeymap } from './lib/cmVim';
import { createAutoSave } from './lib/auto-save';

import { Toolbar } from './components/Toolbar';
import { TabBar } from './components/TabBar';
import { TabContextMenu } from './components/TabContextMenu';
import { StatusBar } from './components/StatusBar';
import { DragOverlay } from './components/DragOverlay';
import { MarkdownPreview } from './components/MarkdownPreview';
import { FindReplaceBar } from './components/FindReplaceBar';
import { TocSidebar } from './components/TocSidebar';


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

  const { handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs,
  });

  // F012 — 包装保存函数，保存成功后创建快照
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
  }, [theme]);

  // F012 — 切换文件时加载对应快照列表
  useEffect(() => {
    if (activeTab.filePath) {
      setSnapshots(getSnapshots(activeTab.filePath));
    } else {
      setSnapshots([]);
    }
  }, [activeTab.filePath]);

  // F010 — TOC 数据 + 跳转处理
  const tocEntries = useMemo(() => extractToc(activeTab.doc), [activeTab.doc]);
  const handleTocNavigate = useCallback((entry: TocEntry) => {
    setActiveTocId(entry.id);
    const editorEl = editorRef.current?.querySelector('.cm-editor') as HTMLElement | undefined;
    if (editorEl) {
      const lines = activeTab.doc.slice(0, entry.position).split('\n');
      const targetLine = lines.length - 1;
      editorEl.dispatchEvent(new CustomEvent('toc-jump', { detail: { line: targetLine } }));
    }
  }, [activeTab.doc, editorRef]);

  useKeyboardShortcuts({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    closeTab, setViewMode, activeTabIdRef,
    toggleFindReplace: () => setShowFindReplace(prev => !prev),
    focusMode, setFocusMode,
  });

  // Per-tab EditorState persistence: preserves cursor position and undo history
  const savedStatesRef = useRef<Map<string, EditorState>>(new Map());

  const handleCreateEditor = useCallback((view: EditorView) => {
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

  // Auto-save: debounce 1s after editing stops
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);
  useEffect(() => {
    autoSaveRef.current = createAutoSave({
      delay: 1000,
      onSave: async () => {
        const tab = getActiveTab();
        if (tab.filePath) {
          await handleSaveFile(activeTabId);
        }
      },
    });
    return () => { autoSaveRef.current?.dispose(); };
  }, [activeTabId]); // 每次切换 tab 创建新的 auto-save

  // Trigger auto-save on content change
  useEffect(() => {
    autoSaveRef.current?.schedule(activeTab.doc);
  }, [activeTab.doc, activeTabId]);

  const editorExtensions = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    foldGutter(),
    cursorExtension,
    autoCloseBrackets(),
    ...(vimExtension ? [vimExtension] : []),
  ];
    const editorSetup = { lineNumbers: true, foldGutter: true, highlightActiveLine: true, tabSize: 2 };

  // F009 — 根据焦点模式动态调整主题色
  const editorTheme = focusMode === 'focus' ? 'dark' : 'light';

  return (
    <div
      className={`flex flex-col h-screen w-full overflow-hidden ${
        focusMode === 'focus' ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-800'
      }`}
      style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}
    >
      {isDragOver && <DragOverlay />}

      {/* F009 — 焦点模式下隐藏工具栏/标签栏/搜索栏 */}
      {!isChromeless && (
        <>
          {showFindReplace && (
            <FindReplaceBar
              content={activeTab.doc}
              onContentChange={(newContent) => updateActiveDoc(newContent)}
              onClose={() => setShowFindReplace(false)}
            />
          )}

          {ctxMenu && (
            <TabContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              tabId={ctxMenu.tabId}
              onSave={handleSaveFile}
              onSaveAs={handleSaveAsFile}
              onClose={closeTab}
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
            onClose={closeTab}
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
            <div className={`h-full overflow-auto border-l ${focusMode === 'focus' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`} ref={previewRef} onScroll={handlePreviewScroll}>
              <div className="p-8">
                <MarkdownPreview content={activeTab.doc} className={`markdown-preview max-w-200 mx-auto min-h-full ${focusMode === 'focus' ? 'markdown-preview-dark' : ''}`} />
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
              <div className={`w-full h-full overflow-auto p-8 ${focusMode === 'focus' ? 'bg-slate-900' : 'bg-white'}`}>
                <MarkdownPreview content={activeTab.doc} className={`markdown-preview w-full ${focusMode === 'focus' ? 'markdown-preview-dark' : ''}`} />
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
        />
      )}
    </div>
  );
}
