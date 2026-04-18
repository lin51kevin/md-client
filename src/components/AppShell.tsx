/**
 * AppShell — main layout skeleton for MarkLite.
 *
 * Contains the Toolbar, Sidebar, Editor, StatusBar, and all modals/overlays.
 * This is extracted from the original App.tsx to reduce its hook count and
 * improve readability.
 *
 * State is sourced from:
 *   - useUIStore       → modal/panel/drag/context-menu visibility
 *   - useEditorStore   → viewMode, splitSizes, isRestoringSession
 *   - usePreferencesStore → theme, spellCheck, vimMode, etc.
 *   - useTabs          → tabs, activeTabId, tab CRUD operations
 *   - useFocusMode     → focus mode management
 *   - Various feature hooks (file ops, git, plugins, etc.)
 */

import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';

import { useI18n } from '../i18n';
import type { DragKind as DragOverlayKind } from '../hooks/useDragDrop';
import { useUpdateNotification } from '../hooks/useUpdateNotification';
import { useUIStore } from '../stores';
import { useEditorStore } from '../stores';
import { useTabs } from '../hooks/useTabs';
import { useFileOps } from '../hooks/useFileOps';
import { useScrollSync } from '../hooks/useScrollSync';
import { useDragDrop } from '../hooks/useDragDrop';
import { useWindowTitle } from '../hooks/useWindowTitle';
import { useWindowInit } from '../hooks/useWindowInit';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCursorPosition } from '../hooks/useCursorPosition';
import { useFocusMode } from '../hooks/useFocusMode';
import { useWelcome } from '../hooks/useWelcome';
import { useEditorContextActions } from '../hooks/useEditorContextActions';
import { useSearchHighlight } from '../hooks/useSearchHighlight';
import { useImagePaste } from '../hooks/useImagePaste';
import { useFormatActions } from '../hooks/useFormatActions';
import { useInputDialog } from '../hooks/useInputDialog';
import { getReadingTime } from '../lib/utils/word-count';
import { useDocMetrics } from '../hooks/useDocMetrics';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useTableEditor } from '../hooks/useTableEditor';
import { useSnippetFlow } from '../hooks/useSnippetFlow';
import { useEditorInstance } from '../hooks/useEditorInstance';
import { usePreferences } from '../hooks/usePreferences';
import { useSidebarPanel } from '../hooks/useSidebarPanel';
import { useRecentFiles } from '../hooks/useRecentFiles';
import { useTabActions } from '../hooks/useTabActions';
import { useNavigation } from '../hooks/useNavigation';
import { useAppLifecycle } from '../hooks/useAppLifecycle';
import { usePendingImageMigration } from '../hooks/usePendingImageMigration';
import { useFileWatchState } from '../hooks/useFileWatchState';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { FileChangeToast } from '../components/editor/FileChangeToast';
import { QuickOpen } from '../components/toolbar/QuickOpen';
import { usePreviewRenderers } from '../hooks/usePreviewRenderers';
import { usePluginRuntime } from '../hooks/usePluginRuntime';
import { usePluginPanels } from '../hooks/usePluginPanels';
import { restoreSnapshot } from '../lib/storage/version-history';
import { StorageKeys } from '../lib/storage';

import { Toolbar } from '../components/toolbar/Toolbar';
import { TabBar } from '../components/toolbar/TabBar';
import { TabContextMenu } from '../components/toolbar/TabContextMenu';
import { EditorContextMenu } from '../components/editor/EditorContextMenu';
import { PreviewContextMenu } from '../components/preview/PreviewContextMenu';
import { StatusBar } from '../components/toolbar/StatusBar';
import { SettingsModal } from '../components/modal/SettingsModal';
import { DragOverlay } from '../components/editor/DragOverlay';
import { SearchPanel } from '../components/toolbar/SearchPanel';
import { TocSidebar } from '../components/sidebar/TocSidebar';
import { FileTreeSidebar, type FileTreeSidebarHandle } from '../components/file/FileTreeSidebar';
import { TableEditor } from '../components/modal/TableEditor';
import { InputDialog } from '../components/modal/InputDialog';
import { CommandPalette } from '../components/toolbar/CommandPalette';
import { SnippetPicker } from '../components/modal/SnippetPicker';
import { SnippetManager } from '../components/modal/SnippetManager';
import { GitPanel } from '../components/modal/GitPanel';
import { PluginPanel } from '../components/plugin';
import { ActivityBar } from '../components/editor/ActivityBar';
import { SidebarContainer } from '../components/sidebar/SidebarContainer';

import { useGit } from '../hooks/useGit';
import { useTypewriterOptions } from '../hooks/useTypewriterOptions';
import { AboutModal } from '../components/modal/AboutModal';
const SlidePreview = lazy(() => import('../components/preview/SlidePreview').then(m => ({ default: m.SlidePreview })));
const MindmapView = lazy(() => import('../components/preview/MindmapView').then(m => ({ default: m.MindmapView })));
import { EditorContentArea } from '../components/editor/EditorContentArea';
import { PluginSidebarRenderer } from '../components/plugin';
import { FloatingPanel } from '../components/modal/FloatingPanel';
import { createCommandRegistry } from '../lib/editor/command-registry';
import { revealInExplorer } from '../lib/file/reveal-in-explorer';
import { UpdateNotification } from '../components/modal/UpdateNotification';

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
  const showCommandPalette = useUIStore((s) => s.showCommandPalette);
  const setShowCommandPalette = useUIStore((s) => s.setShowCommandPalette);
  const showQuickOpen = useUIStore((s) => s.showQuickOpen);
  const setShowQuickOpen = useUIStore((s) => s.setShowQuickOpen);
  const showAIPanel = useUIStore((s) => s.showAIPanel);
  const showUpdateNotification = useUIStore((s) => s.showUpdateNotification);
  const setShowUpdateNotification = useUIStore((s) => s.setShowUpdateNotification);
  const setShowAIPanel = useUIStore((s) => s.setShowAIPanel);

  const isDragOver = useUIStore((s) => s.isDragOver);
  const setIsDragOver = useUIStore((s) => s.setIsDragOver);
  const dragKind = useUIStore((s) => s.dragKind);
  const setDragKind = useUIStore((s) => s.setDragKind);
  const ctxMenu = useUIStore((s) => s.ctxMenu);
  const setCtxMenu = useUIStore((s) => s.setCtxMenu);
  const editorCtxMenu = useUIStore((s) => s.editorCtxMenu);
  const setEditorCtxMenu = useUIStore((s) => s.setEditorCtxMenu);
  const previewCtxMenu = useUIStore((s) => s.previewCtxMenu);
  const setPreviewCtxMenu = useUIStore((s) => s.setPreviewCtxMenu);

  // ── Extracted state hooks ────────────────────────────────────────
  const { activePanel, setActivePanel, togglePanel, showFileTree, showToc, showSearchPanel, showGitPanel, showPluginsPanel } = useSidebarPanel();
  const { spellCheck, setSpellCheck, vimMode, setVimMode, autoSave, setAutoSave, autoSaveDelay, setAutoSaveDelay, gitMdOnly, setGitMdOnly, milkdownPreview, setMilkdownPreview, theme, setThemeState, fileWatch, setFileWatch, fileWatchBehavior, setFileWatchBehavior, autoUpdateCheck, setAutoUpdateCheck, updateCheckFrequency, setUpdateCheckFrequency } = usePreferences();
  const [typewriterOptions, setTypewriterOptions] = useTypewriterOptions();

  // ── Core hooks ───────────────────────────────────────────────────
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();

  const effectiveChromeless = isChromeless || (focusMode === 'typewriter' && typewriterOptions.hideUI);
  const effectiveHideStatusBar = hideStatusBar || (focusMode === 'typewriter' && typewriterOptions.hideUI);

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
  const cmViewRef = useRef<EditorView | null>(null);
  const { editorRef, previewRef, handleEditorScroll, handlePreviewScroll } = useScrollSync(viewMode);

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
  const { cursorPos, cursorExtension } = useCursorPosition();
  const { searchHighlightExtension, setMatches, clearMatches } = useSearchHighlight();

  const { inputDialogState, setInputDialogState, promptUser } = useInputDialog();
  const { handleFormatAction } = useFormatActions({ cmViewRef, getActiveTab, promptUser, isTauri });

  const { handleCloseTab, handleCloseAllTabs, handleCloseOtherTabs, handleCloseToLeft, handleCloseToRight, renamingTabId, setRenamingTabId, handleOpenSample } = useTabActions({
    tabs, closeTab, closeMultipleTabs, setTabDisplayName, handleDismissWelcome, t,
    handleSaveFile: handleSaveWithWatchMark,
  });

  const { editingTable, setEditingTable, handleTableConfirm } = useTableEditor({ cmViewRef, updateActiveDoc });

  const {
    showSnippetPicker, setShowSnippetPicker,
    showSnippetManager, setShowSnippetManager,
    handleSnippetInsert, openSnippetPicker,
  } = useSnippetFlow({ cmViewRef, updateActiveDoc, setEditorCtxMenu });

  const { docRef: _docRef, editorExtensions, editorTheme, handleCreateEditor, handleEditorUpdate, cursorCount, canUndo, canRedo } = useEditorInstance({
    cmViewRef, activeTabId, theme, vimMode, spellCheck, autoSave, autoSaveDelay,
    cursorExtension, searchHighlightExtension,
    activeDoc: activeTab.doc, getActiveTab, rawHandleSaveFile,
    setEditingTable, setEditorCtxMenu,
  });
  void _docRef;

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

  const { handleEditorCtxAction: _baseCtxAction } = useEditorContextActions({
    cmViewRef, handleFormatAction, setEditingTable, setEditorCtxMenu,
  });

  const handleEditorCtxAction = useCallback((action: string) => {
    if (action === 'insertSnippet') { openSnippetPicker(); return; }
    _baseCtxAction(action);
  }, [_baseCtxAction, openSnippetPicker]);

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
          className="fixed top-2 right-2 z-[9999] text-xs px-3 py-1.5 rounded-full transition-all"
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
          hasSelection={(() => {
            const view = cmViewRef.current;
            if (!view) return false;
            const sel = view.state.selection.main;
            return sel.from !== sel.to;
          })()}
          onClose={() => setEditorCtxMenu(null)}
          onAction={handleEditorCtxAction}
        />
      )}

      {previewCtxMenu && (
        <PreviewContextMenu
          visible={!!previewCtxMenu}
          x={previewCtxMenu.x} y={previewCtxMenu.y}
          hasSelection={!!window.getSelection()?.toString()}
          onClose={() => setPreviewCtxMenu(null)}
          onAction={(action) => {
            setPreviewCtxMenu(null);
            switch (action) {
              case 'copy':
                document.execCommand('copy');
                break;
              case 'copyAsMarkdown': {
                const sel = window.getSelection()?.toString() ?? '';
                if (sel) navigator.clipboard.writeText(sel).catch(() => {});
                break;
              }
              case 'selectAll': {
                const preview = previewRef.current;
                if (preview) {
                  const range = document.createRange();
                  range.selectNodeContents(preview);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
                break;
              }
              case 'viewSource':
                setViewMode('edit');
                break;
            }
          }}
        />
      )}

      {editingTable && (
        <TableEditor table={editingTable} onConfirm={handleTableConfirm} onCancel={() => setEditingTable(null)} />
      )}

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
            onUndo={() => { const v = cmViewRef.current; if (v) undo(v); }}
            onRedo={() => { const v = cmViewRef.current; if (v) redo(v); }}
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
            milkdownPreview={milkdownPreview} onMilkdownPreviewChange={setMilkdownPreview}
            fileWatch={fileWatch} onFileWatchChange={setFileWatch}
            fileWatchBehavior={fileWatchBehavior} onFileWatchBehaviorChange={setFileWatchBehavior}
            autoUpdateCheck={autoUpdateCheck} onAutoUpdateCheckChange={setAutoUpdateCheck}
            updateCheckFrequency={updateCheckFrequency} onUpdateCheckFrequencyChange={setUpdateCheckFrequency}
            typewriterOptions={typewriterOptions} onTypewriterOptionsChange={setTypewriterOptions}
          />

          <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} version="0.9.4" />

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
          onOpenRecent={handleOpenRecent} onOpenSample={handleOpenSample}
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
          vimMode={vimMode}
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

      {exporting && (
        <div className="export-loading-indicator">
          <span className="export-spinner" />
          {t('fileOps.exporting', { format: exporting.toUpperCase() })}
        </div>
      )}

      {showUpdateNotification && updateInfo && (
        <div className="fixed bottom-8 right-4 z-[10001]">
          <UpdateNotification
            version={updateInfo.version}
            releaseNotes={updateInfo.releaseNotes}
            onDownload={() => { downloadAndInstall(); }}
            onDismiss={() => setShowUpdateNotification(false)}
            downloadProgress={downloadProgress}
            downloading={isDownloading}
            readyToRestart={readyToRestart}
            onRestart={() => invoke('restart_app')}
          />
        </div>
      )}

      <CommandPalette visible={showCommandPalette} commands={commandRegistry} onClose={() => setShowCommandPalette(false)} locale={locale} />

      <QuickOpen visible={showQuickOpen} onClose={() => setShowQuickOpen(false)} onFileOpen={(path) => openFileInTab(path)} fileTreeRoot={fileTreeRoot} recentFiles={recentFiles} locale={locale} />

      <SnippetPicker visible={showSnippetPicker} onClose={() => setShowSnippetPicker(false)} onSelect={handleSnippetInsert} />

      <SnippetManager visible={showSnippetManager} onClose={() => setShowSnippetManager(false)} />

      {fileChangeToast && (
        <FileChangeToast
          type={fileChangeToast.type}
          filePath={fileChangeToast.filePath}
          tabId={fileChangeToast.tabId}
          onReload={(tabId) => { handleReloadFile(tabId, fileChangeToast.filePath); setFileChangeToast(null); }}
          onKeep={() => setFileChangeToast(null)}
          onSaveAs={(tabId) => { handleSaveAsFile(tabId); setFileChangeToast(null); }}
          onClose={() => setFileChangeToast(null)}
        />
      )}

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
  );
}
