import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
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
import { getReadingTime } from './lib/word-count';
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
import { useAutoUpgrade } from './hooks/useAutoUpgrade';
import { usePendingImageMigration } from './hooks/usePendingImageMigration';
import { useFileWatcher, markSelfSave } from './hooks/useFileWatcher';
import { useAISelection } from './hooks/useAISelection';
import { AIResultModal } from './components/AIResultModal';
import type { AIAction } from './hooks/useAISelection';
import { invoke } from '@tauri-apps/api/core';
import { FileChangeToast } from './components/FileChangeToast';
import { usePreviewRenderers } from './hooks/usePreviewRenderers';
import { usePluginRuntime } from './hooks/usePluginRuntime';
import { usePluginPanels } from './hooks/usePluginPanels';
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
import { useLocalStorageBool } from './hooks/useLocalStorage';
import { useGit } from './hooks/useGit';
import { useTypewriterOptions } from './hooks/useTypewriterOptions';
// Help button now opens GitHub USER_GUIDE.md instead of in-app modal
const SlidePreview = lazy(() => import('./components/SlidePreview').then(m => ({ default: m.SlidePreview })));
const MindmapView = lazy(() => import('./components/MindmapView').then(m => ({ default: m.MindmapView })));
import { EditorContentArea } from './components/EditorContentArea';
import { PluginSidebarRenderer } from './components/PluginSidebarRenderer';
import { FloatingPanel } from './components/FloatingPanel';
import { createCommandRegistry } from './lib/command-registry';
import { revealInExplorer } from './lib/reveal-in-explorer';
import { UpdateNotification } from './components/UpdateNotification';


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
  // showHelp removed — help button now opens external URL

  // ── Extracted state hooks ────────────────────────────────────────
  const { activePanel, setActivePanel, showFileTree, showToc, showSearchPanel, showGitPanel, showPluginsPanel } = useSidebarPanel();
  const [showAIPanel, setShowAIPanel] = useLocalStorageBool('marklite-ai-panel', false);
  const AI_PANEL_ID = 'ai-copilot-official';
  const { spellCheck, setSpellCheck, vimMode, setVimMode, autoSave, setAutoSave, autoSaveDelay, setAutoSaveDelay, gitMdOnly, setGitMdOnly, milkdownPreview, setMilkdownPreview, theme, setThemeState, fileWatch, setFileWatch, fileWatchBehavior, setFileWatchBehavior, autoUpdateCheck, setAutoUpdateCheck, updateCheckFrequency, setUpdateCheckFrequency } = usePreferences();
  const [typewriterOptions, setTypewriterOptions] = useTypewriterOptions();

  // ── Core hooks ───────────────────────────────────────────────────
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();

  // When hideUI is enabled in typewriter mode, treat as chromeless + hide status bar
  const effectiveChromeless = isChromeless || (focusMode === 'typewriter' && typewriterOptions.hideUI);
  const effectiveHideStatusBar = hideStatusBar || (focusMode === 'typewriter' && typewriterOptions.hideUI);

  // Focus duration start timestamp — timer moved to StatusBar to avoid re-rendering App
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
  const [splitSizes, setSplitSizes] = useState<[number, number]>(() => getSavedSplitSizes());

  const {
    tabs, activeTabId, setActiveTabId, activeTabIdRef, tabsRef,
    getActiveTab, getTabTitle, updateActiveDoc, updateTabDoc,
    openFileInTab, openFileWithContent, createNewTab, closeTab, closeMultipleTabs, reorderTabs,
    markSaved, markSavedAs, renameTab, setTabDisplayName, pinTab, unpinTab, updateTab,
  } = useTabs(t, () => recentFilesHook.refreshRecentFiles());

  const isPristine = tabs.length === 1 && !tabs[0].filePath && !tabs[0].isDirty && !tabs[0].displayName;
  const activeTab = getActiveTab();

  // ── Extracted hooks (depend on useTabs) ──────────────────────────
  const recentFilesHook = useRecentFiles({ openFileInTab });
  const { recentFiles, handleOpenRecent, handleClearRecent, handleRemoveRecent } = recentFilesHook;

  const { handleCloseTab, handleCloseAllTabs, handleCloseOtherTabs, handleCloseToLeft, handleCloseToRight, renamingTabId, setRenamingTabId, handleOpenSample } = useTabActions({
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

  // ── File watcher state ────────────────────────────────────────
  const [fileChangeToast, setFileChangeToast] = useState<{ type: 'modified' | 'deleted'; tabId: string; filePath: string; } | null>(null);

  const handleReloadFile = useCallback(async (tabId: string, filePath: string) => {
    try {
      const content = await invoke<string>('read_file_text', { path: filePath });
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        updateTabDoc(tabId, content);
      }
    } catch (err) {
      console.warn('[App] reload file failed:', err);
    }
  }, [tabs, updateTabDoc]);

  // Wrap handleSaveFile to mark self-save for file watcher
  const handleSaveWithWatchMark = useCallback(async (tabId?: string) => {
    await handleSaveFile(tabId);
    const tab = tabId ? tabs.find(t => t.id === tabId) : getActiveTab();
    if (tab?.filePath) markSelfSave(tab.filePath);
  }, [handleSaveFile, tabs, getActiveTab]);

  useFileWatcher({
    tabs,
    enabled: fileWatch,
    onFileChanged: (tabId, filePath) => {
      if (fileWatchBehavior) {
        // Auto-reload unless tab is dirty
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.isDirty) {
          setFileChangeToast({ type: 'modified', tabId, filePath });
        } else {
          handleReloadFile(tabId, filePath);
        }
      } else {
        setFileChangeToast({ type: 'modified', tabId, filePath });
      }
    },
    onFileDeleted: (tabId, filePath) => {
      setFileChangeToast({ type: 'deleted', tabId, filePath });
    },
  });

  // ── Editor infrastructure ────────────────────────────────────────
  const cmViewRef = useRef<EditorView | null>(null);
  const { editorRef, previewRef, handleEditorScroll, handlePreviewScroll } = useScrollSync(viewMode);

  // Apply typewriter-dim class to CodeMirror editor
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

  useDragDrop({ isTauri, setIsDragOver, openFileInTab, onImageDrop: saveAndInsertImage, onFolderDrop: (path) => setFileTreeRoot(path) });
  useWindowTitle(activeTab, isTauri);
  useWindowInit(isTauri, theme);

  // ── Auto-upgrade ────────────────────────────────────────────────
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readyToRestart, setReadyToRestart] = useState(false);

  const { downloadAndInstall, updateInfo, downloading: isDownloading } = useAutoUpgrade({
    enabled: autoUpdateCheck,
    checkFrequency: updateCheckFrequency,
    onUpdateAvailable: () => setShowUpdateNotification(true),
    onDownloadProgress: setDownloadProgress,
    onUpdateReady: () => { setReadyToRestart(true); setDownloadProgress(100); },
    onError: (err) => console.warn('[AutoUpdate]', err),
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

  // ── Auto-activate enabled plugins on startup ─────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('marklite-installed-plugins');
      if (!raw) return;
      const plugins = JSON.parse(raw) as { id: string; enabled: boolean }[];
      for (const p of plugins) {
        if (p.enabled) {
          void activatePlugin(p.id);
        }
      }
    } catch {
      // ignore — plugins will still be activatable via the panel
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset active panel if removed plugin panel was selected ──────
  useEffect(() => {
    if (!activePanel) return;
    const isBuiltin = ['filetree', 'search', 'toc', 'plugins', 'git'].includes(activePanel);
    if (isBuiltin) return;
    const stillExists = pluginPanels.some((pp) => pp.id === activePanel);
    if (!stillExists) setActivePanel(null);
  }, [pluginPanels, activePanel, setActivePanel]);

  // ── App lifecycle effects ────────────────────────────────────────
  useAppLifecycle({ isTauri, openFileWithContent, tabsRef, t });

  // ── Navigation ───────────────────────────────────────────────────
  const { debouncedDoc, tocEntries, wordCount } = useDocMetrics(activeTab.doc, activeTabId);
  const readingTime = useMemo(() => getReadingTime(wordCount), [wordCount]);

  const { activeTocId, handleTocNavigate, handleWikiLinkNavigate, handleSearchResultClick } = useNavigation({
    cmViewRef, previewRef, activeTab, activeTabId, setActiveTabId,
    getActiveTab, openFileInTab, t,
  });

  // ── AI Selection Processing ──────────────────────────────────────
  const [aiSelection, setAISelection] = useState<{ action: AIAction; originalText: string; from: number; to: number } | null>(null);
  const [aiResult, setAIResult] = useState('');

  const handleAIResult = useCallback((result: string) => {
    setAIResult(result);
  }, []);

  const handleAIChunk = useCallback((chunk: string) => {
    setAIResult((prev) => prev + chunk);
  }, []);

  const { processSelection: aiProcess, loading: aiLoading, abort: aiAbort } = useAISelection({
    apiEndpoint: '',
    apiKey: '',
    onResult: handleAIResult,
    onChunk: handleAIChunk,
  });

  const handleAISelection = useCallback((action: AIAction) => {
    const view = cmViewRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.from === sel.to) return;
    const text = view.state.doc.sliceString(sel.from, sel.to);
    setAISelection({ action, originalText: text, from: sel.from, to: sel.to });
    setAIResult('');
    void aiProcess(text, action);
    setEditorCtxMenu(null);
  }, [aiProcess, cmViewRef, setEditorCtxMenu]);

  const handleAIApply = useCallback((replacement: string) => {
    if (!aiSelection || !cmViewRef.current) return;
    const view = cmViewRef.current;
    view.dispatch({
      changes: { from: aiSelection.from, to: aiSelection.to, insert: replacement },
    });
    setAISelection(null);
    setAIResult('');
    view.focus();
  }, [aiSelection, cmViewRef]);

  const handleAIClose = useCallback(() => {
    if (aiLoading) aiAbort();
    setAISelection(null);
    setAIResult('');
  }, [aiLoading, aiAbort]);

  // F014 — Editor right-click actions
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
    toggleFindReplace: () => setActivePanel(activePanel === 'search' ? null : 'search'),
    focusMode, setFocusMode,
    openSnippetPicker,
    toggleFileTree: () => setActivePanel(activePanel === 'filetree' ? null : 'filetree'),
    toggleToc: () => setActivePanel(activePanel === 'toc' ? null : 'toc'),
    toggleAIPanel: () => setShowAIPanel(!showAIPanel),
  });

  // ── Command Palette registry ─────────────────────────────────────
  const commandRegistry = useMemo(() => createCommandRegistry({
    createNewTab, handleOpenFile, handleSaveFile: handleSaveWithWatchMark, handleSaveAsFile,
    setViewMode, focusMode, setFocusMode,
    handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml,
    handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager,
    toggleSearchPanel: () => setActivePanel(activePanel === 'search' ? null : 'search'),
    cmViewRef, isTauri,
  }), [createNewTab, handleOpenFile, handleSaveWithWatchMark, handleSaveAsFile, setViewMode, focusMode, setFocusMode, handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml, handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager, activePanel, setActivePanel, cmViewRef, isTauri]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') { e.preventDefault(); setShowCommandPalette(v => !v); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab?.filePath) revealInExplorer(tab.filePath).catch(console.error);
      }
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
          onAIAction={handleAISelection}
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
            onNewTab={createNewTab} onOpenFile={handleOpenFile}
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
            onOpenHelp={() => { import('@tauri-apps/plugin-opener').then(m => m.openUrl('https://github.com/lin51kevin/md-client/blob/main/USER_GUIDE.md')).catch(() => window.open('https://github.com/lin51kevin/md-client/blob/main/USER_GUIDE.md')); }}
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

          {/* Help button now opens external GitHub USER_GUIDE.md */}

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
        {!effectiveChromeless && (
          <ActivityBar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            onOpenSettings={() => setShowSettings(true)}
            pluginPanels={pluginPanels}
            floatingPanelId={AI_PANEL_ID}
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

          {/* Plugin-registered sidebar panels (left — excludes right panel) */}
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
          useMilkdownPreview={milkdownPreview}
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
          onUpdateClick={() => setShowUpdateNotification(prev => !prev)}
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

      <CommandPalette visible={showCommandPalette} commands={commandRegistry} onClose={() => setShowCommandPalette(false)} locale={i18n.locale} />

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

      {aiSelection && (
        <AIResultModal
          action={aiSelection.action}
          originalText={aiSelection.originalText}
          result={aiResult}
          loading={aiLoading}
          onApply={handleAIApply}
          onCopy={() => navigator.clipboard.writeText(aiResult).catch(() => {})}
          onClose={handleAIClose}
        />
      )}
    </div>
    </I18nContext.Provider>
  );
}

