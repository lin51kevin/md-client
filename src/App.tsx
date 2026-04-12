import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, lazy, Suspense } from 'react';
import { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import './App.css';

import { I18nContext, useI18nProvider } from './i18n';
import { ViewMode } from './types';
import { useTabs } from './hooks/useTabs';
import { useFileOps } from './hooks/useFileOps';
import { useScrollSync } from './hooks/useScrollSync';
import { useDragDrop } from './hooks/useDragDrop';
import { useWindowTitle } from './hooks/useWindowTitle';
import { useWindowInit } from './hooks/useWindowInit';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCursorPosition } from './hooks/useCursorPosition';
import { useFocusMode } from './hooks/useFocusMode';
import { useLocalStorageBool, useLocalStorageNumber } from './hooks/useLocalStorage';
import { useWelcome } from './hooks/useWelcome';
import { useEditorContextActions } from './hooks/useEditorContextActions';
import { useSearchHighlight } from './hooks/useSearchHighlight';
import { useImagePaste } from './hooks/useImagePaste';
import { useFormatActions } from './hooks/useFormatActions';
import { useInputDialog } from './hooks/useInputDialog';
import { useDocMetrics } from './hooks/useDocMetrics';
import { useVersionHistory } from './hooks/useVersionHistory';
import { useTableEditor } from './hooks/useTableEditor';
import { useSnippetFlow } from './hooks/useSnippetFlow';
import { useEditorInstance } from './hooks/useEditorInstance';
import { applyTheme, getSavedTheme, saveTheme, type ThemeName } from './lib/theme';
import { getRecentFiles, clearRecentFiles, type RecentFile } from './lib/recent-files';
import { restoreSnapshot } from './lib/version-history';
import { getSavedSplitSizes } from './lib/split-preference';

import { Toolbar } from './components/Toolbar';
import { TabBar } from './components/TabBar';
import { TabContextMenu } from './components/TabContextMenu';
import { EditorContextMenu } from './components/EditorContextMenu';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { DragOverlay } from './components/DragOverlay';
import { SearchPanel } from './components/SearchPanel';
import { TocSidebar } from './components/TocSidebar';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { TableEditor } from './components/TableEditor';
import { InputDialog } from './components/InputDialog';
import { CommandPalette } from './components/CommandPalette';
import { SnippetPicker } from './components/SnippetPicker';
import { SnippetManager } from './components/SnippetManager';
const HelpModal = lazy(() => import('./components/HelpModal').then(m => ({ default: m.HelpModal })));
const SlidePreview = lazy(() => import('./components/SlidePreview').then(m => ({ default: m.SlidePreview })));
import { EditorContentArea } from './components/EditorContentArea';
import { createCommandRegistry } from './lib/command-registry';
import type { SearchResultItem } from './types/search';


export default function App() {
  const i18n = useI18nProvider();
  const { t } = i18n;

  // ── UI visibility state ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [editorCtxMenu, setEditorCtxMenu] = useState<{ x: number; y: number; context: import('./lib/context-menu').ContextInfo } | null>(null);
  const [showToc, setShowToc] = useLocalStorageBool('marklite-show-toc', false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const [showFileTree, setShowFileTree] = useLocalStorageBool('marklite-show-filetree', false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── Persisted preferences ────────────────────────────────────────
  const [spellCheck, setSpellCheck] = useLocalStorageBool('marklite-spellcheck', true);
  const [vimMode, setVimMode] = useLocalStorageBool('marklite-vimmode', false);
  const [autoSave, setAutoSave] = useLocalStorageBool('marklite-autosave', false);
  const [autoSaveDelay, setAutoSaveDelay] = useLocalStorageNumber('marklite-autosave-delay', 1000);
  const [theme, setThemeState] = useState<ThemeName>(() => getSavedTheme() || 'light');

  // ── Core hooks ───────────────────────────────────────────────────
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();
  const { welcomeDismissed, handleDismissWelcome, handleShowWelcome } = useWelcome();
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(getRecentFiles());
  const [splitSizes, setSplitSizes] = useState<[number, number]>(() => getSavedSplitSizes());
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef,
    getActiveTab, getTabTitle, updateActiveDoc, updateTabDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, reorderTabs,
    markSaved, markSavedAs, renameTab, setTabDisplayName, pinTab, unpinTab,
  } = useTabs(t, () => setRecentFiles(getRecentFiles()));

  const isPristine = tabs.length === 1 && !tabs[0].filePath && !tabs[0].isDirty && !tabs[0].displayName;
  const activeTab = getActiveTab();

  const handleOpenSample = useCallback(() => {
    setTabDisplayName(tabs[0].id, 'sample.md');
    handleDismissWelcome();
  }, [tabs, setTabDisplayName, handleDismissWelcome]);

  const handleOpenRecent = useCallback(async (filePath: string) => {
    await openFileInTab(filePath);
    setRecentFiles(getRecentFiles());
  }, [openFileInTab]);

  const handleClearRecent = useCallback(() => {
    clearRecentFiles();
    setRecentFiles([]);
  }, []);

  // F001 - Confirm close on unsaved changes; F013 - pinned tabs block normal close
  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isPinned) return;
    if (tab?.isDirty) {
      const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
      const path = tab.filePath ?? t('app.unsavedPath');
      const yes = await confirm(t('app.closeTabUnsaved', { name, path }), { title: t('app.closeTab'), kind: 'warning' });
      if (!yes) return;
    }
    closeTab(id);
  }, [tabs, closeTab, t]);

  const handleCloseAllTabs = useCallback(async () => {
    const unpinnedTabs = tabs.filter(t => !t.isPinned);
    for (const tab of unpinnedTabs) {
      if (tab.isDirty) {
        const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
        const path = tab.filePath ?? t('app.unsavedPath');
        const yes = await confirm(t('app.closeTabUnsaved', { name, path }), { title: t('app.closeTab'), kind: 'warning' });
        if (!yes) return;
      }
    }
    for (const tab of unpinnedTabs) closeTab(tab.id);
  }, [tabs, closeTab, t]);

  // ── File operations ──────────────────────────────────────────────
  const { handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml, handleExportEpub, handleExportPng, exporting } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs, t,
  });

  // F012 - Version history wraps rawHandleSaveFile to create snapshots on manual save
  const { snapshots, handleSaveFile } = useVersionHistory({
    rawHandleSaveFile, getActiveTab, tabs, activeFilePath: activeTab.filePath,
  });

  // ── Editor infrastructure ────────────────────────────────────────
  const cmViewRef = useRef<EditorView | null>(null);
  const { editorRef, previewRef, handleEditorScroll, handlePreviewScroll } = useScrollSync(viewMode);
  const { cursorPos, cursorExtension } = useCursorPosition();
  const { searchHighlightExtension, setMatches, clearMatches } = useSearchHighlight();

  // InputDialog replaces window.prompt for link/image URL input
  const { inputDialogState, setInputDialogState, promptUser } = useInputDialog();
  const { handleFormatAction } = useFormatActions({ cmViewRef, getActiveTab, promptUser });

  // Table editor modal
  const { editingTable, setEditingTable, handleTableConfirm } = useTableEditor({ cmViewRef, updateActiveDoc });

  // Snippet picker/manager + insertion
  const {
    showSnippetPicker, setShowSnippetPicker,
    showSnippetManager, setShowSnippetManager,
    handleSnippetInsert, openSnippetPicker,
  } = useSnippetFlow({ cmViewRef, updateActiveDoc, setEditorCtxMenu });

  // CodeMirror lifecycle: state persistence, event listeners, extensions, auto-save
  const { docRef: _docRef, editorExtensions, editorTheme, handleCreateEditor, handleEditorUpdate, cursorCount } = useEditorInstance({
    cmViewRef, activeTabId, theme, vimMode, spellCheck, autoSave, autoSaveDelay,
    cursorExtension, searchHighlightExtension,
    activeDoc: activeTab.doc, getActiveTab, rawHandleSaveFile,
    setEditingTable, setEditorCtxMenu,
  });
  void _docRef; // used internally by useEditorInstance

  // F014 — Image paste/drop insertion
  const insertImageMarkdown = useCallback((mdText: string) => {
    const view = cmViewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({ changes: { from: pos, insert: mdText }, selection: { anchor: pos + mdText.length } });
    view.focus();
  }, [cmViewRef]);

  const { saveAndInsert: saveAndInsertImage } = useImagePaste({
    docPath: activeTab.filePath, insertText: insertImageMarkdown, enabled: true, isTauri,
  });

  useDragDrop({ isTauri, setIsDragOver, openFileInTab, onImageDrop: saveAndInsertImage });
  useWindowTitle(activeTab, isTauri);

  // CLI file open (double-click from file explorer)
  useEffect(() => {
    if (!isTauri) return;
    invoke<{ path: string; content: string } | null>('get_open_file')
      .then((result) => { if (result) openFileWithContent(result.path, result.content); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single-instance: listen for "open-file" event from second instance
  useEffect(() => {
    if (!isTauri) return;
    
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('open-file', async (event: { payload: string }) => {
          const filePath = event.payload;
          try {
            const content = await invoke<string>('read_file_text', { path: filePath });
            openFileWithContent(filePath, content);
            // Focus the window
            const window = getCurrentWindow();
            await window.unminimize();
            await window.setFocus();
          } catch (err) {
            console.error('Failed to open file from second instance:', err);
          }
        });
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F011 - Theme: apply CSS vars synchronously before paint
  useLayoutEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // Window initialization + native titlebar theme
  useWindowInit(isTauri, theme);

  // Window close confirmation for unsaved changes
  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | null = null;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('tauri://close-requested', async (event) => {
          const dirtyTabs = tabs.filter(tab => tab.isDirty);
          
          if (dirtyTabs.length > 0) {
            const shouldClose = await confirm(
              t('common.unsavedChangesMessage', { count: dirtyTabs.length }),
              { title: t('common.unsavedChanges'), kind: 'warning' }
            );
            
            if (!shouldClose) {
              // Prevent the window from closing
              return;
            }
          }
          
          // Allow the window to close
          const window = getCurrentWindow();
          await window.destroy();
        }).then(fn => {
          unlisten = fn;
        });
      });
    });

    return () => {
      unlisten?.();
    };
  }, [isTauri, tabs, t]);

  // F010 - Debounced TOC + word count
  const { debouncedDoc, tocEntries, wordCount } = useDocMetrics(activeTab.doc, activeTabId);

  const handleTocNavigate = useCallback((entry: import('./hooks/useDocMetrics').TocEntry) => {
    setActiveTocId(entry.id);
    const view = cmViewRef.current;
    if (view) {
      const pos = Math.min(entry.position, view.state.doc.length);
      view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 40 }) });
    }
    const previewEl = previewRef.current;
    if (previewEl) {
      const heading = previewEl.querySelector(`[id="${CSS.escape(entry.id)}"]`) as HTMLElement | null;
      if (heading) {
        const offset = heading.getBoundingClientRect().top - previewEl.getBoundingClientRect().top + previewEl.scrollTop;
        previewEl.scrollTo({ top: Math.max(0, offset - 40), behavior: 'smooth' });
      } else {
        const docLen = activeTab.doc.length;
        const ratio = docLen > 0 ? entry.position / docLen : 0;
        previewEl.scrollTo({ top: Math.max(0, ratio * (previewEl.scrollHeight - previewEl.clientHeight) - 40), behavior: 'smooth' });
      }
    }
  }, [previewRef, activeTab.doc]);

  // [B1 FIX] Wiki-link navigation
  const handleWikiLinkNavigate = useCallback(async (target: string) => {
    const currentDir = getActiveTab()?.filePath?.replace(/[/\\][^/\\]+$/, '') ?? '';
    for (const name of [`${target}.md`, target]) {
      const candidatePath = currentDir ? `${currentDir}/${name}` : name;
      try { await invoke<string>('read_file_text', { path: candidatePath }); await openFileInTab(candidatePath); return; }
      catch { /* try next */ }
    }
    const yes = await confirm(`文档 "${target}" 未找到，是否创建？`, { title: t('wiki.create', { name: target }), kind: 'warning' });
    if (yes) {
      const newPath = currentDir ? `${currentDir}/${target}.md` : `${target}.md`;
      try { await invoke('create_file', { path: newPath }); await openFileInTab(newPath); }
      catch (e) { await message(e instanceof Error ? e.message : String(e), { title: t('fileOps.error'), kind: 'error' }); }
    }
  }, [getActiveTab, openFileInTab, t]);

  // Search result navigation
  const handleSearchResultClick = useCallback(async (result: SearchResultItem) => {
    const scrollTo = (sameTab: boolean) => {
      setTimeout(() => {
        const view = cmViewRef.current;
        if (!view) return;
        const lineInfo = view.state.doc.line(Math.max(0, result.line_number - 1) + 1);
        const anchor = lineInfo.from + result.match_start;
        view.dispatch({ selection: { anchor, head: lineInfo.from + result.match_end }, effects: EditorView.scrollIntoView(anchor, { y: 'center', yMargin: 40 }) });
        view.focus();
      }, sameTab ? 0 : 200);
    };
    if (result.tab_id) {
      const same = result.tab_id === activeTabId;
      if (!same) setActiveTabId(result.tab_id);
      scrollTo(same);
      return;
    }
    const isCurrentFile = !result.file_path || result.file_path === activeTab.filePath;
    if (!isCurrentFile) await openFileInTab(result.file_path);
    scrollTo(isCurrentFile);
  }, [openFileInTab, activeTab.filePath, activeTabId, setActiveTabId]);

  // F014 — Editor right-click actions
  const { handleEditorCtxAction: _baseCtxAction } = useEditorContextActions({
    cmViewRef, handleFormatAction, setEditingTable, setEditorCtxMenu,
  });

  const handleEditorCtxAction = useCallback((action: string) => {
    if (action === 'insertSnippet') { openSnippetPicker(); return; }
    _baseCtxAction(action);
  }, [_baseCtxAction, openSnippetPicker]);

  useKeyboardShortcuts({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    closeTab: handleCloseTab, setViewMode, activeTabIdRef,
    toggleFindReplace: () => setShowSearchPanel(prev => !prev),
    focusMode, setFocusMode,
    openSnippetPicker,
    toggleFileTree: () => setShowFileTree(!showFileTree),
    toggleToc: () => setShowToc(!showToc),
  });

  // ── Command Palette registry ─────────────────────────────────────
  const commandRegistry = useMemo(() => createCommandRegistry({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    setViewMode, focusMode, setFocusMode,
    handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml,
    handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager,
    setShowSearchPanel, cmViewRef, isTauri,
  }), [createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile, setViewMode, focusMode, setFocusMode, handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml, handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager, setShowSearchPanel, cmViewRef, isTauri]);


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') { e.preventDefault(); setShowCommandPalette(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <I18nContext.Provider value={i18n}>
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      data-theme={theme}
      onContextMenu={(e) => e.preventDefault()}
      style={{ fontFamily: 'Segoe UI, system-ui, sans-serif', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {isDragOver && <DragOverlay />}

      {inputDialogState && (
        <InputDialog
          visible={true}
          {...inputDialogState.config}
          onConfirm={(value) => { inputDialogState.resolve(value); setInputDialogState(null); }}
          onCancel={() => { inputDialogState.resolve(null); setInputDialogState(null); }}
        />
      )}

      {editorCtxMenu && (
        <EditorContextMenu
          visible={!!editorCtxMenu}
          x={editorCtxMenu.x} y={editorCtxMenu.y}
          context={editorCtxMenu.context}
          onClose={() => setEditorCtxMenu(null)}
          onAction={handleEditorCtxAction}
        />
      )}

      {editingTable && (
        <TableEditor table={editingTable} onConfirm={handleTableConfirm} onCancel={() => setEditingTable(null)} />
      )}

      {!isChromeless && (
        <>
          {ctxMenu && (
            <TabContextMenu
              x={ctxMenu.x} y={ctxMenu.y} tabId={ctxMenu.tabId}
              onSave={handleSaveFile} onSaveAs={handleSaveAsFile} onClose={handleCloseTab}
              onRename={(id) => { setCtxMenu(null); setRenamingTabId(id); }}
              onPin={(id) => { pinTab(id); setCtxMenu(null); }}
              onUnpin={(id) => { unpinTab(id); setCtxMenu(null); }}
              tabs={tabs} onDismiss={() => setCtxMenu(null)} onCloseAll={handleCloseAllTabs}
            />
          )}

          <Toolbar
            viewMode={viewMode} focusMode={focusMode} showToc={showToc} showFileTree={showFileTree}
            onToggleFileTree={() => setShowFileTree(!showFileTree)}
            onNewTab={createNewTab} onOpenFile={handleOpenFile}
            onSaveFile={() => handleSaveFile()} onSaveAsFile={() => handleSaveAsFile()}
            onExportDocx={handleExportDocx} onExportPdf={handleExportPdf}
            onExportHtml={handleExportHtml} onExportEpub={handleExportEpub}
            onExportPng={() => handleExportPng(previewRef.current)}
            onSetViewMode={setViewMode} onFocusModeChange={setFocusMode}
            onToggleToc={() => setShowToc(!showToc)}
            spellCheck={spellCheck} onToggleSpellCheck={() => setSpellCheck(!spellCheck)}
            vimMode={vimMode} onToggleVimMode={() => setVimMode(!vimMode)}
            recentFiles={recentFiles} onOpenRecent={handleOpenRecent} onClearRecent={handleClearRecent}
            onCloseAll={handleCloseAllTabs}
            onToggleSearch={() => setShowSearchPanel(prev => !prev)} showSearch={showSearchPanel}
            onFormatAction={handleFormatAction} onImageLocal={() => handleFormatAction('image-local')}
            onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)}
            onInsertSnippet={openSnippetPicker}
            tabs={tabs} activeTabId={activeTabId} onActivateTab={setActiveTabId}
          />

          <SettingsModal
            visible={showSettings} onClose={() => setShowSettings(false)}
            currentTheme={theme} onThemeChange={setThemeState}
            spellCheck={spellCheck} onSpellCheckChange={setSpellCheck}
            vimMode={vimMode} onVimModeChange={setVimMode}
            autoSave={autoSave} onAutoSaveChange={setAutoSave}
            autoSaveDelay={autoSaveDelay} onAutoSaveDelayChange={setAutoSaveDelay}
          />

          {showHelp && (
            <Suspense fallback={null}>
              <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
            </Suspense>
          )}

          <TabBar
            tabs={isPristine ? [] : tabs} activeTabId={activeTabId}
            onActivate={setActiveTabId} onClose={handleCloseTab}
            onNew={createNewTab} onReorder={reorderTabs}
            onContextMenu={(x, y, tabId) => setCtxMenu({ x, y, tabId })}
            getTabTitle={getTabTitle} renamingTabId={renamingTabId}
            onStartRename={setRenamingTabId}
            onConfirmRename={async (id, name) => { const ok = await renameTab(id, name); if (ok) setRenamingTabId(null); }}
            onCancelRename={() => setRenamingTabId(null)}
            onPin={pinTab} onUnpin={unpinTab}
            showWelcomeTab={isPristine && !welcomeDismissed}
            onCloseWelcomeTab={handleDismissWelcome} onCloseAll={handleCloseAllTabs}
          />
        </>
      )}

      <div className="flex-1 overflow-hidden flex">
        <FileTreeSidebar visible={showFileTree} onFileOpen={(path) => openFileInTab(path)} activeFilePath={activeTab.filePath ?? null} onClose={() => setShowFileTree(false)} />
        <TocSidebar key={activeTabId} toc={isPristine ? [] : tocEntries} onNavigate={handleTocNavigate} activeId={activeTocId} visible={showToc} onClose={() => setShowToc(false)} />

        <EditorContentArea
          isPristine={isPristine} welcomeDismissed={welcomeDismissed}
          viewMode={viewMode} activeTabId={activeTabId} activeTab={activeTab}
          splitSizes={splitSizes} onSplitDragEnd={setSplitSizes}
          editorRef={editorRef} previewRef={previewRef}
          handleEditorScroll={handleEditorScroll} handlePreviewScroll={handlePreviewScroll}
          editorTheme={editorTheme} editorExtensions={editorExtensions}
          updateActiveDoc={updateActiveDoc}
          handleCreateEditor={handleCreateEditor} handleEditorUpdate={handleEditorUpdate}
          spellCheck={spellCheck} debouncedDoc={debouncedDoc}
          openFileInTab={openFileInTab} handleWikiLinkNavigate={handleWikiLinkNavigate}
          theme={theme} recentFiles={recentFiles}
          onNew={createNewTab} onOpenFile={handleOpenFile}
          onOpenRecent={handleOpenRecent} onOpenSample={handleOpenSample}
          onDismiss={handleDismissWelcome} onShowWelcome={handleShowWelcome}
        />
      </div>

      {!hideStatusBar && (
        <StatusBar
          filePath={activeTab.filePath} isDirty={activeTab.isDirty}
          line={cursorPos.line} col={cursorPos.col}
          snapshots={snapshots} wordCount={wordCount} cursorCount={cursorCount}
          onSnapshotRestore={(id) => {
            if (!activeTab.filePath) return;
            const content = restoreSnapshot(activeTab.filePath, id);
            if (content !== null) updateActiveDoc(content);
          }}
        />
      )}

      <SearchPanel
        visible={showSearchPanel} content={activeTab.doc}
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
        openTabs={tabs} currentTabId={activeTabId} onAnyTabContentChange={updateTabDoc}
      />

      {exporting && (
        <div className="export-loading-indicator">
          <span className="export-spinner" />
          {t('fileOps.exporting', { format: exporting.toUpperCase() })}
        </div>
      )}

      <CommandPalette visible={showCommandPalette} commands={commandRegistry} onClose={() => setShowCommandPalette(false)} locale={i18n.locale} />

      <SnippetPicker visible={showSnippetPicker} onClose={() => setShowSnippetPicker(false)} onSelect={handleSnippetInsert} />

      <SnippetManager visible={showSnippetManager} onClose={() => setShowSnippetManager(false)} />

      {viewMode === 'slide' && activeTab && (
        <SlidePreview
          markdown={activeTab.doc}
          onClose={() => setViewMode('split')}
        />
      )}
    </div>
    </I18nContext.Provider>
  );
}

