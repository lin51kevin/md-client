import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { EditorView } from '@codemirror/view';
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
import { usePreferences } from './hooks/usePreferences';
import { useSidebarPanel } from './hooks/useSidebarPanel';
import { useRecentFiles } from './hooks/useRecentFiles';
import { useTabActions } from './hooks/useTabActions';
import { useNavigation } from './hooks/useNavigation';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { usePendingImageMigration } from './hooks/usePendingImageMigration';
import { usePreviewRenderers } from './hooks/usePreviewRenderers';
import { usePluginRuntime } from './hooks/usePluginRuntime';
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
import { GitPanel } from './components/GitPanel';
import { PluginPanel } from './components/PluginPanel';
import { ActivityBar } from './components/ActivityBar';
import { SidebarContainer } from './components/SidebarContainer';
import { useGit } from './hooks/useGit';
const HelpModal = lazy(() => import('./components/HelpModal').then(m => ({ default: m.HelpModal })));
const SlidePreview = lazy(() => import('./components/SlidePreview').then(m => ({ default: m.SlidePreview })));
const MindmapView = lazy(() => import('./components/MindmapView').then(m => ({ default: m.MindmapView })));
import { EditorContentArea } from './components/EditorContentArea';
import { createCommandRegistry } from './lib/command-registry';


export default function App() {
  const i18n = useI18nProvider();
  const { t } = i18n;

  // ── UI visibility state ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isDragOver, setIsDragOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [editorCtxMenu, setEditorCtxMenu] = useState<{ x: number; y: number; context: import('./lib/context-menu').ContextInfo } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── Extracted state hooks ────────────────────────────────────────
  const { activePanel, setActivePanel, showFileTree, showToc, showSearchPanel, showGitPanel, showPluginsPanel } = useSidebarPanel();
  const { spellCheck, setSpellCheck, vimMode, setVimMode, autoSave, setAutoSave, autoSaveDelay, setAutoSaveDelay, gitMdOnly, setGitMdOnly, theme, setThemeState } = usePreferences();

  // ── Core hooks ───────────────────────────────────────────────────
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();
  const { renderers: pluginRenderers, registerPreviewRenderer, unregisterPreviewRenderer } = usePreviewRenderers();
  const { welcomeDismissed, handleDismissWelcome, handleShowWelcome } = useWelcome();
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const [splitSizes, setSplitSizes] = useState<[number, number]>(() => getSavedSplitSizes());

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef, tabsRef,
    getActiveTab, getTabTitle, updateActiveDoc, updateTabDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, closeMultipleTabs, reorderTabs,
    markSaved, markSavedAs, renameTab, setTabDisplayName, pinTab, unpinTab,
  } = useTabs(t, () => recentFilesHook.refreshRecentFiles());

  const isPristine = tabs.length === 1 && !tabs[0].filePath && !tabs[0].isDirty && !tabs[0].displayName;
  const activeTab = getActiveTab();

  // ── Extracted hooks (depend on useTabs) ──────────────────────────
  const recentFilesHook = useRecentFiles({ openFileInTab });
  const { recentFiles, handleOpenRecent, handleClearRecent, handleRemoveRecent } = recentFilesHook;

  const { handleCloseTab, handleCloseAllTabs, renamingTabId, setRenamingTabId, handleOpenSample } = useTabActions({
    tabs, closeTab, closeMultipleTabs, setTabDisplayName, handleDismissWelcome, t,
  });

  const { handleFirstSave } = usePendingImageMigration({ tabs, updateTabDoc, markSaved });

  // ── Git state (based on opened folder) ──
  const [fileTreeRoot, setFileTreeRoot] = useState<string>(() => {
    try { return localStorage.getItem('marklite-filetree-root') || ''; } catch { return ''; }
  });
  const gitRepoPath = fileTreeRoot || null;
  const git = useGit(showGitPanel ? gitRepoPath : null);

  // ── File operations ──────────────────────────────────────────────
  const { handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml, handleExportEpub, handleExportPng, exporting } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs, t, onFirstSave: handleFirstSave,
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

  const { inputDialogState, setInputDialogState, promptUser } = useInputDialog();
  const { handleFormatAction } = useFormatActions({ cmViewRef, getActiveTab, promptUser, isTauri });

  const { editingTable, setEditingTable, handleTableConfirm } = useTableEditor({ cmViewRef, updateActiveDoc });

  const {
    showSnippetPicker, setShowSnippetPicker,
    showSnippetManager, setShowSnippetManager,
    handleSnippetInsert, openSnippetPicker,
  } = useSnippetFlow({ cmViewRef, updateActiveDoc, setEditorCtxMenu });

  const { docRef: _docRef, editorExtensions, editorTheme, handleCreateEditor, handleEditorUpdate, cursorCount } = useEditorInstance({
    cmViewRef, activeTabId, theme, vimMode, spellCheck, autoSave, autoSaveDelay,
    cursorExtension, searchHighlightExtension,
    activeDoc: activeTab.doc, getActiveTab, rawHandleSaveFile,
    setEditingTable, setEditorCtxMenu,
  });
  void _docRef;

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
    tabId: activeTabId,
  });

  useDragDrop({ isTauri, setIsDragOver, openFileInTab, onImageDrop: saveAndInsertImage });
  useWindowTitle(activeTab, isTauri);
  useWindowInit(isTauri, theme);

  // ── Plugin runtime ───────────────────────────────────────────────
  const pluginRuntimeDeps = useMemo(() => ({
    getActiveTab: () => {
      const t = getActiveTab();
      return { path: t.filePath, content: t.doc };
    },
    openFileInTab: (path: string) => void openFileInTab(path),
    getOpenFilePaths: () => tabs.filter(t => t.filePath).map(t => t.filePath!),
    cmViewRef,
    registerSidebarPanel: () => {},
    unregisterSidebarPanel: () => {},
    addStatusBarItem: () => {},
    removeStatusBarItem: () => {},
    registerPreviewRenderer,
    unregisterPreviewRenderer,
  }), [getActiveTab, openFileInTab, tabs, cmViewRef, registerPreviewRenderer, unregisterPreviewRenderer]);

  const { activatePlugin, deactivatePlugin } = usePluginRuntime(pluginRuntimeDeps);

  // ── App lifecycle effects ────────────────────────────────────────
  useAppLifecycle({ isTauri, openFileWithContent, tabsRef, t });

  // ── Navigation ───────────────────────────────────────────────────
  const { debouncedDoc, tocEntries, wordCount } = useDocMetrics(activeTab.doc, activeTabId);

  const { activeTocId, handleTocNavigate, handleWikiLinkNavigate, handleSearchResultClick } = useNavigation({
    cmViewRef, previewRef, activeTab, activeTabId, setActiveTabId,
    getActiveTab, openFileInTab, t,
  });

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
    toggleFindReplace: () => setActivePanel(activePanel === 'search' ? null : 'search'),
    focusMode, setFocusMode,
    openSnippetPicker,
    toggleFileTree: () => setActivePanel(activePanel === 'filetree' ? null : 'filetree'),
    toggleToc: () => setActivePanel(activePanel === 'toc' ? null : 'toc'),
  });

  // ── Command Palette registry ─────────────────────────────────────
  const commandRegistry = useMemo(() => createCommandRegistry({
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    setViewMode, focusMode, setFocusMode,
    handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml,
    handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager,
    toggleSearchPanel: () => setActivePanel(activePanel === 'search' ? null : 'search'),
    cmViewRef, isTauri,
  }), [createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile, setViewMode, focusMode, setFocusMode, handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml, handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager, activePanel, setActivePanel, cmViewRef, isTauri]);

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
            viewMode={viewMode} focusMode={focusMode}
            onNewTab={createNewTab} onOpenFile={handleOpenFile}
            onSaveFile={() => handleSaveFile()} onSaveAsFile={() => handleSaveAsFile()}
            onExportDocx={handleExportDocx} onExportPdf={handleExportPdf}
            onExportHtml={handleExportHtml} onExportEpub={handleExportEpub}
            onExportPng={() => handleExportPng(previewRef.current)}
            onSetViewMode={setViewMode} onFocusModeChange={setFocusMode}
            spellCheck={spellCheck} onToggleSpellCheck={() => setSpellCheck(!spellCheck)}
            vimMode={vimMode} onToggleVimMode={() => setVimMode(!vimMode)}
            recentFiles={recentFiles} onOpenRecent={handleOpenRecent} onClearRecent={handleClearRecent} onRemoveRecent={handleRemoveRecent}
            onCloseAll={handleCloseAllTabs}
            onFormatAction={handleFormatAction} onImageLocal={() => handleFormatAction('image-local')}
            onOpenHelp={() => setShowHelp(true)}
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
            gitMdOnly={gitMdOnly} onGitMdOnlyChange={setGitMdOnly}
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

      {/* ── Main body: ActivityBar + panels + editor ──────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Activity Bar (VS Code style) */}
        {!isChromeless && (
          <ActivityBar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Left sidebar panels — wrapped in resizable container */}
        <SidebarContainer activePanel={activePanel}>
          <FileTreeSidebar visible={showFileTree} onFileOpen={(path) => openFileInTab(path)} activeFilePath={activeTab.filePath ?? null} onClose={() => setActivePanel(null)} onRootChange={setFileTreeRoot} />
          <TocSidebar key={activeTabId} toc={isPristine ? [] : tocEntries} onNavigate={handleTocNavigate} activeId={activeTocId} visible={showToc} onClose={() => setActivePanel(null)} />

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
            onClose={() => { clearMatches(); setActivePanel(null); }}
            openTabs={tabs} currentTabId={activeTabId} onAnyTabContentChange={updateTabDoc}
          />

          {showPluginsPanel && (
            <PluginPanel
              visible={showPluginsPanel}
              onClose={() => setActivePanel(null)}
              onActivate={activatePlugin}
              onDeactivate={deactivatePlugin}
            />
          )}

          {showGitPanel && (
            <GitPanel
              isRepo={git.isRepo}
              branch={git.branch}
              ahead={git.ahead}
              behind={git.behind}
              files={gitMdOnly ? git.files.filter(f => /\.(md|mdx|markdown|mdown|mkd|mkdn|txt|rst|adoc|org)$/i.test(f.path)) : git.files}
              isLoading={git.isLoading}
              error={git.error}
              onCommit={git.commit}
              onPull={git.pull}
              onPush={git.push}
              onRefresh={git.refresh}
              onClose={() => setActivePanel(null)}
              onDiff={git.getDiff}
              onStage={git.stage}
              onUnstage={git.unstage}
              onRestore={git.restore}
              onFileOpen={(path) => openFileInTab(gitRepoPath ? `${gitRepoPath}/${path}` : path)}
            />
          )}
        </SidebarContainer>

        {/* Editor content area */}
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
          pluginRenderers={pluginRenderers}
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
        <Suspense fallback={null}>
          <SlidePreview
            markdown={activeTab.doc}
            onClose={() => setViewMode('split')}
          />
        </Suspense>
      )}

      {viewMode === 'mindmap' && activeTab && (
        <Suspense fallback={null}>
          <MindmapView
            markdown={activeTab.doc}
            onClose={() => setViewMode('split')}
            onNavigate={handleTocNavigate}
          />
        </Suspense>
      )}
    </div>
    </I18nContext.Provider>
  );
}

