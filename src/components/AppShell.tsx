/**
 * AppShell — main layout skeleton for MarkLite.
 *
 * Orchestrates state hooks and renders the primary layout structure.
 * Editor infrastructure is delegated to useEditorCore.
 * Context menus and inline modals are rendered via AppContextMenus.
 * Global overlays (CommandPalette, QuickOpen, etc.) via AppGlobalOverlays.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { undo, redo } from '@codemirror/commands';

import { useI18n } from '../i18n';
import type { DragKind as DragOverlayKind } from '../hooks/useDragDrop';
import { useUpdateNotification } from '../hooks/useUpdateNotification';
import { useUIStore, useEditorStore } from '../stores';
import { useTabs } from '../hooks/useTabs';
import { useFileOps } from '../hooks/useFileOps';
import { useDragDrop } from '../hooks/useDragDrop';
import { useWindowTitle } from '../hooks/useWindowTitle';
import { useWindowInit } from '../hooks/useWindowInit';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFocusMode } from '../hooks/useFocusMode';
import { useWelcome } from '../hooks/useWelcome';
import { useDocMetrics } from '../hooks/useDocMetrics';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useNavigation } from '../hooks/useNavigation';
import { useAppLifecycle } from '../hooks/useAppLifecycle';
import { usePendingImageMigration } from '../hooks/usePendingImageMigration';
import { useFileWatchState } from '../hooks/useFileWatchState';
import { useRecentFiles } from '../hooks/useRecentFiles';
import { useTabActions } from '../hooks/useTabActions';
import { useTypewriterOptions } from '../hooks/useTypewriterOptions';
import { usePreviewRenderers } from '../hooks/usePreviewRenderers';
import { usePluginRuntime } from '../hooks/usePluginRuntime';
import { usePluginPanels } from '../hooks/usePluginPanels';
import { useGit } from '../hooks/useGit';
import { usePreferences } from '../hooks/usePreferences';
import { useSidebarPanel } from '../hooks/useSidebarPanel';
import { useEditorCore } from '../hooks/useEditorCore';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { getReadingTime } from '../lib/utils/word-count';
import { restoreSnapshot } from '../lib/storage/version-history';
import { StorageKeys } from '../lib/storage';
import { revealInExplorer } from '../lib/file/reveal-in-explorer';
import { createCommandRegistry } from '../lib/editor/command-registry';
import { milkdownBridge } from '../lib/milkdown/editor-bridge';

import { Toolbar } from '../components/toolbar/Toolbar';
import { TabBar } from '../components/toolbar/TabBar';
import { TabContextMenu } from '../components/toolbar/TabContextMenu';
import { StatusBar } from '../components/toolbar/StatusBar';
import { SettingsModal } from '../components/modal/SettingsModal';
import { DragOverlay } from '../components/editor/DragOverlay';
import { SearchPanel } from '../components/toolbar/SearchPanel';
import { TocSidebar } from '../components/sidebar/TocSidebar';
import { FileTreeSidebar, type FileTreeSidebarHandle } from '../components/file/FileTreeSidebar';
import { ActivityBar } from '../components/editor/ActivityBar';
import { SidebarContainer } from '../components/sidebar/SidebarContainer';
import { GitPanel } from '../components/modal/GitPanel';
import { PluginPanel } from '../components/plugin';
import { AboutModal } from '../components/modal/AboutModal';
import { EditorContentArea } from '../components/editor/EditorContentArea';
import { PluginSidebarRenderer } from '../components/plugin';
import { FloatingPanel } from '../components/modal/FloatingPanel';
import { AppContextMenus } from '../components/editor/AppContextMenus';
import { AppGlobalOverlays } from '../components/AppGlobalOverlays';

export function AppShell() {
  const { t, locale } = useI18n();

  // ── Zustand store selectors ──────────────────────────────────────
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const splitSizes = useEditorStore((s) => s.splitSizes);
  const setSplitSizes = useEditorStore((s) => s.setSplitSizes);

  const showSettings = useUIStore((s) => s.showSettings);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const showAbout = useUIStore((s) => s.showAbout);
  const setShowAbout = useUIStore((s) => s.setShowAbout);
  const showAIPanel = useUIStore((s) => s.showAIPanel);
  const setShowAIPanel = useUIStore((s) => s.setShowAIPanel);

  const isDragOver = useUIStore((s) => s.isDragOver);
  const setIsDragOver = useUIStore((s) => s.setIsDragOver);
  const dragKind = useUIStore((s) => s.dragKind);
  const setDragKind = useUIStore((s) => s.setDragKind);
  const ctxMenu = useUIStore((s) => s.ctxMenu);
  const setCtxMenu = useUIStore((s) => s.setCtxMenu);
  const setPreviewCtxMenu = useUIStore((s) => s.setPreviewCtxMenu);

  // ── Extracted state hooks ────────────────────────────────────────
  const { activePanel, setActivePanel, togglePanel, showFileTree, showToc, showSearchPanel, showGitPanel, showPluginsPanel } = useSidebarPanel();
  const { spellCheck, setSpellCheck, vimMode, setVimMode, autoSave, setAutoSave, autoSaveDelay, setAutoSaveDelay, gitMdOnly, setGitMdOnly, milkdownPreview, setMilkdownPreview, mermaidTheme, setMermaidTheme, theme, setTheme, fileWatch, setFileWatch, fileWatchBehavior, setFileWatchBehavior, autoUpdateCheck, setAutoUpdateCheck, updateCheckFrequency, setUpdateCheckFrequency } = usePreferences();
  const [typewriterOptions, setTypewriterOptions] = useTypewriterOptions();

  // ── Core hooks ───────────────────────────────────────────────────
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();

  const effectiveChromeless = isChromeless || (focusMode === 'typewriter' && typewriterOptions.hideUI);
  const effectiveHideStatusBar = hideStatusBar || (focusMode === 'typewriter' && typewriterOptions.hideUI);

  // WYSIWYG mode: auto-switch to preview view when milkdownPreview is enabled
  useEffect(() => {
    if (milkdownPreview && viewMode !== 'preview' && viewMode !== 'slide' && viewMode !== 'mindmap') {
      setViewMode('preview');
    }
  }, [milkdownPreview]);

  const focusStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (focusMode === 'typewriter') {
      if (!focusStartRef.current) focusStartRef.current = Date.now();
    } else {
      focusStartRef.current = null;
    }
  }, [focusMode]);
  const { renderers: pluginRenderers, registerPreviewRenderer, unregisterPreviewRenderer } = usePreviewRenderers();
  const { panels: pluginPanels, registerPanel: registerPluginPanel, unregisterPanel: unregisterPluginPanel } = usePluginPanels();
  const { welcomeDismissed, handleDismissWelcome, handleShowWelcome } = useWelcome();
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef, tabsRef,
    isRestoringSession,
    getActiveTab, getTabTitle, updateActiveDoc, updateTabDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, closeMultipleTabs, reorderTabs,
    markSaved, markSavedAs, renameTab, setTabDisplayName, pinTab, unpinTab, updateTab,
    nextTab, previousTab,
  } = useTabs(t, () => recentFilesHook.refreshRecentFiles());

  const isPristine = tabs.length === 1 && !tabs[0].filePath && !tabs[0].isDirty && !tabs[0].displayName;
  const activeTab = getActiveTab();

  // ── Extracted hooks (depend on useTabs) ──────────────────────────
  const recentFilesHook = useRecentFiles({ openFileInTab });
  const { recentFiles, handleOpenRecent, handleClearRecent, handleRemoveRecent } = recentFilesHook;

  const { handleFirstSave } = usePendingImageMigration({ tabs, updateTabDoc, markSaved });

  // ── Git state (based on opened folder) ──
  const [fileTreeRoot, setFileTreeRoot] = useState<string>(() => {
    try { return localStorage.getItem(StorageKeys.FILETREE_ROOT) || ''; } catch { return ''; }
  });
  const gitRepoPath = fileTreeRoot || null;
  const git = useGit(showGitPanel ? gitRepoPath : null);

  // ── File operations ──────────────────────────────────────────────
  const { handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile, handleExportDocx, handleExportPdf, handleExportHtml, handleExportEpub, handleExportPng, exporting } = useFileOps({
    getActiveTab, tabs, openFileInTab, markSaved, markSavedAs, t, onFirstSave: handleFirstSave,
  });

  const { snapshots, handleSaveFile } = useVersionHistory({
    rawHandleSaveFile, getActiveTab, tabs, activeFilePath: activeTab.filePath,
  });

  // ── File watcher state ────────────────────────────────────────
  const { fileChangeToast, setFileChangeToast, handleReloadFile } = useFileWatchState({
    tabs, enabled: fileWatch, autoReload: fileWatchBehavior, updateTab,
  });

  const handleSaveWithWatchMark = handleSaveFile;

  // ── Editor infrastructure ────────────────────────────────────────
  const {
    cmViewRef,
    editorRef, previewRef, handleEditorScroll, handlePreviewScroll,
    cursorPos,
    setMatches, clearMatches,
    inputDialogState, setInputDialogState,
    handleFormatAction,
    editingTable, setEditingTable, handleTableConfirm,
    showSnippetPicker, setShowSnippetPicker,
    showSnippetManager, setShowSnippetManager,
    handleSnippetInsert, openSnippetPicker,
    editorExtensions, editorTheme,
    handleCreateEditor, handleEditorUpdate,
    cursorCount, canUndo, canRedo,
    handleEditorCtxAction,
    saveAndInsertImage,
  } = useEditorCore({
    activeTabId, activeTab, viewMode, milkdownPreview, theme, vimMode,
    spellCheck, autoSave, autoSaveDelay, isTauri,
    rawHandleSaveFile, updateActiveDoc, getActiveTab,
  });

  useEffect(() => {
    const editorEl = editorRef.current?.querySelector('.cm-editor');
    if (editorEl) {
      if (focusMode === 'typewriter' && typewriterOptions.dimOthers) {
        editorEl.classList.add('typewriter-dim');
      } else {
        editorEl.classList.remove('typewriter-dim');
      }
    }
  }, [focusMode, typewriterOptions.dimOthers, editorRef]);

  const { handleCloseTab, handleCloseAllTabs, handleCloseOtherTabs, handleCloseToLeft, handleCloseToRight, renamingTabId, setRenamingTabId, handleOpenSample } = useTabActions({
    tabs, closeTab, closeMultipleTabs, setTabDisplayName, handleDismissWelcome, t,
    handleSaveFile: handleSaveWithWatchMark,
  });

  const fileTreeSidebarRef = useRef<FileTreeSidebarHandle>(null);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        const folderPath = selected as string;
        setFileTreeRoot(folderPath);
        setActivePanel('filetree');
        fileTreeSidebarRef.current?.loadRoot(folderPath);
      }
    } catch (e) {
      console.warn('[App] handleOpenFolder failed:', e);
    }
  }, [setFileTreeRoot, setActivePanel]);

  useDragDrop({ isTauri, setIsDragOver, setDragKind, openFileInTab, onImageDrop: saveAndInsertImage, onFolderDrop: (path) => {
    setFileTreeRoot(path);
    setActivePanel('filetree');
    fileTreeSidebarRef.current?.loadRoot(path);
  } });
  useWindowTitle(activeTab, isTauri);
  useWindowInit(isTauri, theme);

  // ── Auto-upgrade ────────────────────────────────────────────────
  const { downloadProgress, readyToRestart, downloadAndInstall, updateInfo, isDownloading } = useUpdateNotification({
    enabled: autoUpdateCheck,
    checkFrequency: updateCheckFrequency,
  });

  // ── Plugin runtime ───────────────────────────────────────────────
  const pluginRuntimeDeps = useMemo(() => ({
    getActiveTab: () => {
      const t = getActiveTab();
      return { path: t.filePath, content: t.doc };
    },
    openFileInTab: (path: string) => void openFileInTab(path),
    openNewUntitled: (content: string) => createNewTab(content),
    getOpenFilePaths: () => tabs.filter(t => t.filePath).map(t => t.filePath!),
    cmViewRef,
    registerSidebarPanel: registerPluginPanel,
    unregisterSidebarPanel: unregisterPluginPanel,
    addStatusBarItem: () => {},
    removeStatusBarItem: () => {},
    registerPreviewRenderer,
    unregisterPreviewRenderer,
  }), [getActiveTab, openFileInTab, createNewTab, tabs, cmViewRef, registerPluginPanel, unregisterPluginPanel, registerPreviewRenderer, unregisterPreviewRenderer]);

  const { activatePlugin, deactivatePlugin } = usePluginRuntime(pluginRuntimeDeps);

  // ── Reset active panel if removed plugin panel was selected ──────
  useEffect(() => {
    if (!activePanel) return;
    const isBuiltin = ['filetree', 'search', 'toc', 'plugins', 'git'].includes(activePanel);
    if (isBuiltin) return;
    const stillExists = pluginPanels.some((pp) => pp.id === activePanel);
    if (!stillExists) setActivePanel(null);
  }, [pluginPanels, activePanel, setActivePanel]);

  // ── App lifecycle effects ────────────────────────────────────────
  useAppLifecycle({ isTauri, isRestoringSession, openFileWithContent, tabsRef, t });

  // ── Navigation ───────────────────────────────────────────────────
  const { debouncedDoc, tocEntries, wordCount } = useDocMetrics(activeTab.doc, activeTabId);
  const readingTime = useMemo(() => getReadingTime(wordCount), [wordCount]);

  const { activeTocId, handleTocNavigate, handleWikiLinkNavigate, handleSearchResultClick } = useNavigation({
    cmViewRef, previewRef, activeTab, activeTabId, setActiveTabId,
    getActiveTab, openFileInTab, t,
  });

  useKeyboardShortcuts({
    createNewTab, handleOpenFile, handleSaveFile: handleSaveWithWatchMark, handleSaveAsFile,
    closeTab: handleCloseTab, setViewMode, activeTabIdRef,
    toggleFindReplace: () => togglePanel('search'),
    focusMode, setFocusMode,
    openSnippetPicker,
    toggleFileTree: () => togglePanel('filetree'),
    toggleToc: () => togglePanel('toc'),
    toggleAIPanel: () => setShowAIPanel(!showAIPanel),
    nextTab, previousTab,
    toggleCommandPalette: () => { const cur = useUIStore.getState().showCommandPalette; useUIStore.getState().setShowCommandPalette(!cur); },
    toggleQuickOpen: () => { const cur = useUIStore.getState().showQuickOpen; useUIStore.getState().setShowQuickOpen(!cur); },
    revealActiveFile: () => {
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab?.filePath) revealInExplorer(tab.filePath).catch(console.error);
    },
  });

  const commandRegistry = useMemo(() => createCommandRegistry({
    createNewTab, handleOpenFile, handleSaveFile: handleSaveWithWatchMark, handleSaveAsFile,
    setViewMode, focusMode, setFocusMode,
    handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml,
    handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager,
    toggleSearchPanel: () => togglePanel('search'),
    cmViewRef, isTauri,
  }), [createNewTab, handleOpenFile, handleSaveWithWatchMark, handleSaveAsFile, setViewMode, focusMode, setFocusMode, handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml, handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager, activePanel, setActivePanel, cmViewRef, isTauri]);

  const AI_PANEL_ID = 'ai-copilot-official';

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      data-theme={theme}
      onContextMenu={(e) => e.preventDefault()}
      style={{ fontFamily: 'Segoe UI, system-ui, sans-serif', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {isDragOver && <DragOverlay dragKind={dragKind as DragOverlayKind} />}

      {/* Exit button for hideUI typewriter mode */}
      {focusMode === 'typewriter' && typewriterOptions.hideUI && (
        <button
          className="fixed top-2 right-2 z-9999 text-xs px-3 py-1.5 rounded-full transition-all"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-color)',
          }}
          onClick={() => setFocusMode('normal')}
          title={t('focusMode.exitFocus')}
        >
          ✕
        </button>
      )}

      <AppContextMenus
        inputDialogState={inputDialogState}
        setInputDialogState={setInputDialogState}
        editingTable={editingTable}
        setEditingTable={setEditingTable}
        handleTableConfirm={handleTableConfirm}
        cmViewRef={cmViewRef}
        handleEditorCtxAction={handleEditorCtxAction}
        previewRef={previewRef}
        wysiwygMode={milkdownPreview}
      />

      {!effectiveChromeless && (
        <>
          {ctxMenu && (
            <TabContextMenu
              x={ctxMenu.x} y={ctxMenu.y} tabId={ctxMenu.tabId}
              onSave={handleSaveWithWatchMark} onSaveAs={handleSaveAsFile} onClose={handleCloseTab}
              onRename={(id) => { setCtxMenu(null); setRenamingTabId(id); }}
              onPin={(id) => { pinTab(id); setCtxMenu(null); }}
              onUnpin={(id) => { unpinTab(id); setCtxMenu(null); }}
              tabs={tabs} onDismiss={() => setCtxMenu(null)} onCloseAll={handleCloseAllTabs}
              onReveal={(id) => { const tab = tabs.find(t => t.id === id); if (tab?.filePath) revealInExplorer(tab.filePath).catch(console.error); }}
              onCloseOthers={(id) => { handleCloseOtherTabs(id); setCtxMenu(null); }}
              onCloseLeft={(id) => { handleCloseToLeft(id); setCtxMenu(null); }}
              onCloseRight={(id) => { handleCloseToRight(id); setCtxMenu(null); }}
              onSetColor={(id, color) => { updateTab(id, { color }); setCtxMenu(null); }}
            />
          )}

          <Toolbar
            viewMode={viewMode} focusMode={focusMode}
            onNewTab={createNewTab} onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder}
            onSaveFile={() => handleSaveWithWatchMark()} onSaveAsFile={() => handleSaveAsFile()}
            onExportDocx={handleExportDocx} onExportPdf={handleExportPdf}
            onExportHtml={handleExportHtml} onExportEpub={handleExportEpub}
            onExportPng={() => handleExportPng(previewRef.current)}
            onSetViewMode={setViewMode} onFocusModeChange={setFocusMode}
            spellCheck={spellCheck} onToggleSpellCheck={() => setSpellCheck(!spellCheck)}
            vimMode={vimMode} onToggleVimMode={() => setVimMode(!vimMode)}
            recentFiles={recentFiles} onOpenRecent={handleOpenRecent} onClearRecent={handleClearRecent} onRemoveRecent={handleRemoveRecent}
            onCloseAll={handleCloseAllTabs}
            onFormatAction={handleFormatAction} onImageLocal={() => handleFormatAction('image-local')}
            onOpenHelp={() => { import('@tauri-apps/plugin-opener').then(m => m.openUrl('https://github.com/lin51kevin/md-client/blob/main/docs/guides/USER_GUIDE.md')).catch(() => window.open('https://github.com/lin51kevin/md-client/blob/main/docs/guides/USER_GUIDE.md')); }}
            onOpenAbout={() => setShowAbout(true)}
            aiCopilotEnabled={pluginPanels.some(pp => pp.id === AI_PANEL_ID)}
            showAIPanel={showAIPanel}
            onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
            onInsertSnippet={openSnippetPicker}
            canUndo={canUndo} canRedo={canRedo}
            onUndo={() => {
              if (milkdownPreview) { milkdownBridge.undo?.(); return; }
              const v = cmViewRef.current; if (v) undo(v);
            }}
            onRedo={() => {
              if (milkdownPreview) { milkdownBridge.redo?.(); return; }
              const v = cmViewRef.current; if (v) redo(v);
            }}
            tabs={tabs} activeTabId={activeTabId} onActivateTab={setActiveTabId}
            wysiwygMode={milkdownPreview}
          />

          <SettingsModal
            visible={showSettings} onClose={() => setShowSettings(false)}
            currentTheme={theme} onThemeChange={setTheme}
            spellCheck={spellCheck} onSpellCheckChange={setSpellCheck}
            vimMode={vimMode} onVimModeChange={setVimMode}
            autoSave={autoSave} onAutoSaveChange={setAutoSave}
            autoSaveDelay={autoSaveDelay} onAutoSaveDelayChange={setAutoSaveDelay}
            gitMdOnly={gitMdOnly} onGitMdOnlyChange={setGitMdOnly}
            milkdownPreview={milkdownPreview} onMilkdownPreviewChange={setMilkdownPreview}
            mermaidTheme={mermaidTheme} onMermaidThemeChange={setMermaidTheme}
            fileWatch={fileWatch} onFileWatchChange={setFileWatch}
            fileWatchBehavior={fileWatchBehavior} onFileWatchBehaviorChange={setFileWatchBehavior}
            autoUpdateCheck={autoUpdateCheck} onAutoUpdateCheckChange={setAutoUpdateCheck}
            updateCheckFrequency={updateCheckFrequency} onUpdateCheckFrequencyChange={setUpdateCheckFrequency}
            typewriterOptions={typewriterOptions} onTypewriterOptionsChange={setTypewriterOptions}
          />

          <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} version="0.9.5" />

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
        {!effectiveChromeless && (
          <ActivityBar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            onOpenSettings={() => setShowSettings(true)}
            pluginPanels={pluginPanels}
            floatingPanelId={AI_PANEL_ID}
          />
        )}

        <SidebarContainer activePanel={activePanel}>
          <FileTreeSidebar ref={fileTreeSidebarRef} visible={showFileTree} onFileOpen={(path) => openFileInTab(path)} activeFilePath={activeTab.filePath ?? null} onClose={() => setActivePanel(null)} onRootChange={setFileTreeRoot} />
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

          {pluginPanels.map((pp) => (
            pp.id !== AI_PANEL_ID && activePanel === pp.id && (
              <div key={pp.id} className="w-full h-full flex flex-col overflow-hidden text-xs select-none" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{pp.title}</span>
                  <button onClick={() => setActivePanel(null)} className="text-xs" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>✕</button>
                </div>
                <div className="flex-1 overflow-auto">
                  <PluginSidebarRenderer content={pp.content} />
                </div>
              </div>
            )
          ))}
        </SidebarContainer>

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
          onNew={createNewTab} onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder}
          onOpenRecent={handleOpenRecent} onNewWithContent={(content, displayName) => {
    openFileWithContent('', content, displayName);
  }} onOpenSample={handleOpenSample}
          onDismiss={handleDismissWelcome} onShowWelcome={handleShowWelcome}
          pluginRenderers={pluginRenderers}
          useMilkdownPreview={milkdownPreview}
          onPreviewContextMenu={(x, y) => setPreviewCtxMenu({ x, y })}
        />

        {/* Floating AI Chat Panel */}
        {(() => {
          const aiPanel = pluginPanels.find((pp) => pp.id === AI_PANEL_ID);
          if (!aiPanel) return null;
          const content = aiPanel.content as { onClose?: () => void; onDragStart?: (e: React.MouseEvent) => void } | null;
          if (content && typeof content === 'object') {
            content.onClose = () => setShowAIPanel(false);
          }
          return (
            <FloatingPanel visible={showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap'}>
              {(dragHandle) => {
                if (content && typeof content === 'object') {
                  content.onDragStart = dragHandle;
                }
                return <PluginSidebarRenderer content={aiPanel.content} />;
              }}
            </FloatingPanel>
          );
        })()}
      </div>

      {!effectiveHideStatusBar && (
        <StatusBar
          filePath={activeTab.filePath} isDirty={activeTab.isDirty}
          line={cursorPos.line} col={cursorPos.col}
          snapshots={snapshots} wordCount={wordCount} readingTime={readingTime} cursorCount={cursorCount}
          vimMode={vimMode} wysiwygMode={milkdownPreview}
          focusStartTime={typewriterOptions.showDuration && focusMode === 'typewriter' ? focusStartRef.current ?? undefined : undefined}
          updateAvailable={updateInfo}
          onUpdateClick={() => { const cur = useUIStore.getState().showUpdateNotification; useUIStore.getState().setShowUpdateNotification(!cur); }}
          onSnapshotRestore={(id) => {
            if (!activeTab.filePath) return;
            const content = restoreSnapshot(activeTab.filePath, id);
            if (content !== null) updateActiveDoc(content);
          }}
        />
      )}

      <AppGlobalOverlays
        commandRegistry={commandRegistry}
        locale={locale}
        fileTreeRoot={fileTreeRoot}
        recentFiles={recentFiles}
        openFileInTab={openFileInTab}
        showSnippetPicker={showSnippetPicker}
        setShowSnippetPicker={setShowSnippetPicker}
        onSnippetInsert={handleSnippetInsert}
        showSnippetManager={showSnippetManager}
        setShowSnippetManager={setShowSnippetManager}
        activeTabDoc={activeTab.doc}
        onTocNavigate={handleTocNavigate}
        fileChangeToast={fileChangeToast}
        onReloadFile={handleReloadFile}
        onKeepFile={() => setFileChangeToast(null)}
        onSaveAsFile={handleSaveAsFile}
        onCloseToast={() => setFileChangeToast(null)}
        updateInfo={updateInfo}
        downloadProgress={downloadProgress}
        isDownloading={isDownloading}
        readyToRestart={readyToRestart}
        onDownloadUpdate={downloadAndInstall}
        onDismissUpdate={() => {}}
        exporting={exporting}
      />
    </div>
  );
}
