/**
 * useEditorCore — orchestration hook for the editor infrastructure layer.
 *
 * Bundles the 10 editor-specific hooks that were previously called directly
 * in AppShell, reducing AppShell's hook count without changing any behavior.
 *
 * Includes: scroll sync, cursor position, search highlight, input dialog,
 * format actions, table editor, snippet flow, editor instance, image paste,
 * and editor context actions.
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { EditorView } from '@codemirror/view';
import type { MutableRefObject } from 'react';
import type { Tab } from '../types';
import type { ViewMode } from '../types';
import type { ThemeName } from '../lib/theme';
import { useUIStore } from '../stores';
import { useScrollSync } from './useScrollSync';
import { useCursorPosition } from './useCursorPosition';
import { useSearchHighlight } from './useSearchHighlight';
import { useInputDialog } from './useInputDialog';
import { useFormatActions } from './useFormatActions';
import { useTableEditor } from './useTableEditor';
import { useSnippetFlow } from './useSnippetFlow';
import { useEditorInstance } from './useEditorInstance';
import { useImagePaste } from './useImagePaste';
import { useEditorContextActions } from './useEditorContextActions';
import { useZoom } from './useZoom';
import { milkdownBridge } from '../lib/milkdown/editor-bridge';

interface EditorCoreInput {
  activeTabId: string;
  activeTab: Tab;
  viewMode: ViewMode;
  milkdownPreview: boolean;
  theme: ThemeName;
  vimMode: boolean;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  isTauri: boolean;
  rawHandleSaveFile: (tabId?: string) => Promise<void>;
  updateActiveDoc: (content: string) => void;
  getActiveTab: () => Tab;
}

export function useEditorCore({
  activeTabId,
  activeTab,
  viewMode,
  milkdownPreview,
  theme,
  vimMode,
  spellCheck,
  autoSave,
  autoSaveDelay,
  isTauri,
  rawHandleSaveFile,
  updateActiveDoc,
  getActiveTab,
}: EditorCoreInput) {
  const cmViewRef = useRef<EditorView | null>(null);

  // Read setEditorCtxMenu from store — avoids threading it through AppShell
  const setEditorCtxMenu = useUIStore((s) => s.setEditorCtxMenu);

  const { editorRef, previewRef, handleEditorScroll, handlePreviewScroll, triggerEditorScroll } = useScrollSync(viewMode);
  const { cursorExtension } = useCursorPosition();

  // ── Zoom (Ctrl+wheel handler attached to zoomContainerRef) ─────────
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  useZoom(zoomContainerRef);
  const { searchHighlightExtension, setMatches, clearMatches } = useSearchHighlight();
  const { inputDialogState, setInputDialogState, promptUser } = useInputDialog();
  const { handleFormatAction } = useFormatActions({ cmViewRef, getActiveTab, promptUser, isTauri });
  const { editingTable, setEditingTable, handleTableConfirm } = useTableEditor({ cmViewRef, updateActiveDoc });
  const {
    showSnippetPicker, setShowSnippetPicker,
    showSnippetManager, setShowSnippetManager,
    handleSnippetInsert, openSnippetPicker,
  } = useSnippetFlow({ cmViewRef, updateActiveDoc, setEditorCtxMenu });

  const { docRef: _docRef, editorExtensions, editorTheme, handleCreateEditor: _baseHandleCreateEditor, handleEditorUpdate, cursorCount, canUndo: cmCanUndo, canRedo: cmCanRedo } = useEditorInstance({
    cmViewRef, activeTabId, theme, vimMode, spellCheck, autoSave, autoSaveDelay,
    cursorExtension, searchHighlightExtension,
    activeDoc: activeTab.doc, getActiveTab, rawHandleSaveFile,
    setEditingTable, setEditorCtxMenu,
    languageId: activeTab.languageId,
  });
  void _docRef;

  // ── Minimap scroll bridge (split mode) ────────────────────────────────────
  // In split mode the outer wrapper div is overflow-hidden and CodeMirror owns
  // its own scroll (height="100%"). The minimap from @replit/codemirror-minimap
  // sets view.scrollDOM.scrollTop directly. We relay scroll events from
  // view.scrollDOM → triggerEditorScroll so the preview pane stays in sync.
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  const attachScrollListener = useCallback((view: EditorView) => {
    scrollCleanupRef.current?.();
    // Point editorRef to view.scrollDOM so scroll-sync calculations use the
    // correct scrollable element.
    (editorRef as MutableRefObject<HTMLDivElement | null>).current =
      view.scrollDOM as HTMLDivElement;
    view.scrollDOM.addEventListener('scroll', triggerEditorScroll, { passive: true });
    scrollCleanupRef.current = () => {
      view.scrollDOM.removeEventListener('scroll', triggerEditorScroll);
    };
  }, [editorRef, triggerEditorScroll]);

  const handleCreateEditor = useCallback((view: EditorView) => {
    _baseHandleCreateEditor(view);
    if (viewMode === 'split') {
      attachScrollListener(view);
    }
  }, [_baseHandleCreateEditor, viewMode, attachScrollListener]);

  // Re-attach / detach listener when the user switches view modes.
  useEffect(() => {
    const view = cmViewRef.current;
    if (!view) return;
    if (viewMode === 'split') {
      attachScrollListener(view);
    } else {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
    }
    return () => {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
    };
  }, [viewMode, attachScrollListener]);

  // WYSIWYG mode: subscribe to milkdownBridge for undo/redo state
  const [milkUndoRedo, setMilkUndoRedo] = useState<[boolean, boolean]>([false, false]);
  useEffect(() => {
    if (!milkdownPreview) {
      return;
    }
    const unsub = milkdownBridge.onUndoRedoChange((canUndo, canRedo) => {
      setMilkUndoRedo([canUndo, canRedo]);
    });
    // Init from current bridge state
    setMilkUndoRedo([milkdownBridge.canUndo, milkdownBridge.canRedo]);
    return unsub;
  }, [milkdownPreview]);

  const insertImageMarkdown = useCallback((mdText: string) => {
    // WYSIWYG mode: insert into Milkdown via bridge
    if (milkdownPreview && milkdownBridge.insertText) {
      milkdownBridge.insertText(mdText);
      return;
    }
    // Source mode: insert into CodeMirror
    const view = cmViewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({ changes: { from: pos, insert: mdText }, selection: { anchor: pos + mdText.length } });
    view.focus();
  }, [milkdownPreview]);

  const { saveAndInsert: saveAndInsertImage } = useImagePaste({
    docPath: activeTab.filePath,
    insertText: insertImageMarkdown,
    enabled: true,
    isTauri,
    tabId: activeTabId,
  });

  const { handleEditorCtxAction: _baseCtxAction } = useEditorContextActions({
    cmViewRef, handleFormatAction, setEditingTable, setEditorCtxMenu,
  });

  const handleEditorCtxAction = useCallback((action: string) => {
    if (action === 'insertSnippet') { openSnippetPicker(); return; }
    _baseCtxAction(action);
  }, [_baseCtxAction, openSnippetPicker]);

  return {
    cmViewRef,
    editorRef, previewRef, zoomContainerRef, handleEditorScroll, handlePreviewScroll,
    setMatches, clearMatches,
    inputDialogState, setInputDialogState,
    handleFormatAction,
    editingTable, setEditingTable, handleTableConfirm,
    showSnippetPicker, setShowSnippetPicker,
    showSnippetManager, setShowSnippetManager,
    handleSnippetInsert, openSnippetPicker,
    editorExtensions, editorTheme,
    handleCreateEditor, handleEditorUpdate,
    cursorCount, canUndo: milkdownPreview ? milkUndoRedo[0] : cmCanUndo, canRedo: milkdownPreview ? milkUndoRedo[1] : cmCanRedo,
    handleEditorCtxAction,
    saveAndInsertImage,
  };
}
