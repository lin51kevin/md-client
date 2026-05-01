import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import type { Extension } from '@codemirror/state';
import type { EditorState, ViewUpdate } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { undoDepth, redoDepth } from '@codemirror/commands';
/** Maximum number of tab editor states to keep in memory (LRU eviction) */
const MAX_SAVED_STATES = 20;

import { createAutoSave } from '../lib/editor';
import { detectContext } from '../lib/editor';
import { parseTable } from '../lib/markdown';
import type { TableData } from '../lib/markdown';
import type { ContextInfo } from '../lib/editor';
import type { Tab } from '../types';
import type { ThemeName } from '../lib/theme';
import { useEditorConfig } from './useEditorConfig';

interface UseEditorInstanceOptions {
  /** Shared EditorView ref — created in App and passed to all hooks that need it */
  cmViewRef: RefObject<EditorView | null>;
  activeTabId: string;
  theme: ThemeName;
  vimMode: boolean;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  cursorExtension: Extension;
  searchHighlightExtension: Extension;
  activeDoc: string;
  getActiveTab: () => Tab;
  rawHandleSaveFile: (tabId?: string) => Promise<void>;
  setEditingTable: (table: TableData | null) => void;
  setEditorCtxMenu: (menu: { x: number; y: number; context: ContextInfo } | null) => void;
  /** Language ID of the active file (e.g. 'markdown', 'typescript') */
  languageId?: string;
}

export function useEditorInstance({
  cmViewRef,
  activeTabId,
  theme,
  vimMode,
  spellCheck,
  autoSave,
  autoSaveDelay,
  cursorExtension,
  searchHighlightExtension,
  activeDoc,
  getActiveTab,
  rawHandleSaveFile,
  setEditingTable,
  setEditorCtxMenu,
  languageId = 'markdown',
}: UseEditorInstanceOptions) {
  const docRef = useRef<string>(activeDoc);
  const [activeEditorView, setActiveEditorView] = useState<EditorView | null>(null);
  const [cursorCount, setCursorCount] = useState(1);

  // Per-tab EditorState persistence: preserves cursor position and undo history.
  // themeKey is stored alongside the state so we can detect stale theme configs on restore.
  const savedStatesRef = useRef<Map<string, { state: EditorState; themeKey: string }>>(new Map());

  // Keep docRef up to date for contextmenu listener (avoids stale closure)
  useEffect(() => { docRef.current = activeDoc; }, [activeDoc]);

  // ── Editor extensions and theme (configuration concern) ──────────
  const largeFile = activeDoc.length > 500 * 1024; // 500 KB threshold
  const { editorExtensions, editorTheme } = useEditorConfig({
    theme,
    vimMode,
    cursorExtension,
    searchHighlightExtension,
    largeFile,
    languageId,
  });

  const handleCreateEditor = useCallback((view: EditorView) => {
    cmViewRef.current = view;
    setActiveEditorView(view); // triggers contextmenu/dblclick re-bind
    let saved = savedStatesRef.current.get(activeTabId);
    // LRU: mark as recently accessed
    if (saved) {
      savedStatesRef.current.delete(activeTabId);
      savedStatesRef.current.set(activeTabId, saved);
    }
    if (saved) {
      if (saved.themeKey === theme) {
        // Same theme: restore full state (cursor, undo history, config)
        view.setState(saved.state);
      } else {
        // Theme changed since this tab was last active: the saved EditorState embeds
        // the old CM theme extensions. Only restore the cursor selection.
        view.dispatch({ selection: saved.state.selection });
      }
      // Sync undo/redo button state for the restored history
      setCanUndo(undoDepth(saved.state) > 0);
      setCanRedo(redoDepth(saved.state) > 0);
    } else {
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [activeTabId, theme]);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const handleEditorUpdate = useCallback((viewUpdate: ViewUpdate) => {
    // LRU: evict oldest if at capacity
    if (savedStatesRef.current.size >= MAX_SAVED_STATES && !savedStatesRef.current.has(activeTabId)) {
      const oldestKey = savedStatesRef.current.keys().next().value;
      if (oldestKey !== undefined) savedStatesRef.current.delete(oldestKey);
    }
    savedStatesRef.current.delete(activeTabId);
    savedStatesRef.current.set(activeTabId, { state: viewUpdate.state, themeKey: theme });
    const rangeCount = viewUpdate.state.selection.ranges.length;
    setCursorCount(rangeCount);
    if (viewUpdate.docChanged) {
      setCanUndo(undoDepth(viewUpdate.state) > 0);
      setCanRedo(redoDepth(viewUpdate.state) > 0);
    }
  }, [activeTabId, theme]);

  // Attach contextmenu + dblclick listeners whenever a new EditorView mounts.
  // Depends on activeEditorView state (not just activeTabId) so it re-runs on:
  //   - viewMode changes (split ↔ edit uses a different CodeMirror instance)
  //   - WelcomePage dismiss (CodeMirror was hidden, now mounts for the first time)
  useEffect(() => {
    const view = activeEditorView;
    if (!view) return;

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
  }, [activeEditorView, setEditorCtxMenu, setEditingTable]);

  // Apply spellcheck directly to contentDOM when the setting changes —
  // avoids the per-keystroke overhead of an updateListener.
  useEffect(() => {
    const dom = cmViewRef.current?.contentDOM;
    if (dom) dom.spellcheck = spellCheck;
  }, [spellCheck]);

  // Keep refs up to date to avoid stale closures in auto-save callback
  const rawHandleSaveFileRef = useRef(rawHandleSaveFile);
  const getActiveTabRef = useRef(getActiveTab);
  useEffect(() => { rawHandleSaveFileRef.current = rawHandleSaveFile; }, [rawHandleSaveFile]);
  useEffect(() => { getActiveTabRef.current = getActiveTab; }, [getActiveTab]);

  // Auto-save: debounce after editing stops.
  // Writes to disk only — snapshots are created solely by manual Ctrl+S.
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);
  useEffect(() => {
    // Only create auto-save instance if enabled
    if (!autoSave) {
      autoSaveRef.current?.dispose();
      autoSaveRef.current = null;
      return;
    }
    
    autoSaveRef.current = createAutoSave({
      delay: autoSaveDelay,
      onSave: async () => {
        const tab = getActiveTabRef.current();
        if (tab.filePath) {
          await rawHandleSaveFileRef.current(activeTabId);
        }
      },
    });
    return () => { autoSaveRef.current?.dispose(); };
  }, [activeTabId, autoSave, autoSaveDelay]);

  // Trigger auto-save whenever doc content changes (only if auto-save is enabled)
  useEffect(() => {
    if (autoSave) {
      autoSaveRef.current?.schedule(activeDoc);
    }
  }, [activeDoc, activeTabId, autoSave]);

  return {
    docRef,
    activeEditorView,
    editorExtensions,
    editorTheme,
    handleCreateEditor,
    handleEditorUpdate,
    cursorCount,
    canUndo,
    canRedo,
  };
}
