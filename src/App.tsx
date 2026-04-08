import { useState, useRef, useCallback, useEffect } from 'react';
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


export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef,
    getActiveTab, getTabTitle, updateActiveDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, reorderTabs,
    markSaved, markSavedAs,
  } = useTabs();

  const { handleOpenFile, handleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs,
  });

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

  useKeyboardShortcuts({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    closeTab, setViewMode, activeTabIdRef,
    toggleFindReplace: () => setShowFindReplace(prev => !prev),
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

  return (
    <div
      className="flex flex-col h-screen w-full bg-white text-slate-800 overflow-hidden"
      style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}
    >
      {isDragOver && <DragOverlay />}

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
        onNewTab={createNewTab}
        onOpenFile={handleOpenFile}
        onSaveFile={() => handleSaveFile()}
        onSaveAsFile={() => handleSaveAsFile()}
        onExportDocx={handleExportDocx}
        onExportPdf={handleExportPdf}
        onExportHtml={handleExportHtml}
        onSetViewMode={setViewMode}
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

      <div className="flex-1 overflow-hidden">
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
                  theme="light"
                  extensions={editorExtensions}
                  onChange={updateActiveDoc}
                  onCreateEditor={handleCreateEditor}
                  onUpdate={handleEditorUpdate}
                  basicSetup={editorSetup}
                />
              </div>
            </div>
            <div className="h-full overflow-auto bg-white border-l border-slate-200" ref={previewRef} onScroll={handlePreviewScroll}>
              <div className="p-8">
                <MarkdownPreview content={activeTab.doc} className="markdown-preview max-w-200 mx-auto min-h-full" />
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
                  theme="light"
                  extensions={editorExtensions}
                  onChange={updateActiveDoc}
                  onCreateEditor={handleCreateEditor}
                  onUpdate={handleEditorUpdate}
                  basicSetup={editorSetup}
                />
              </div>
            ) : (
              <div className="w-full h-full overflow-auto p-8 bg-white">
                <MarkdownPreview content={activeTab.doc} className="markdown-preview w-full" />
              </div>
            )}
          </div>
        )}
      </div>

      <StatusBar filePath={activeTab.filePath} line={cursorPos.line} col={cursorPos.col} />
    </div>
  );
}
