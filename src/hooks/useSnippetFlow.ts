import { useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { EditorView } from '@codemirror/view';

interface UseSnippetFlowOptions {
  cmViewRef: RefObject<EditorView | null>;
  updateActiveDoc: (doc: string) => void;
  setEditorCtxMenu: (menu: null) => void;
}

export function useSnippetFlow({ cmViewRef, updateActiveDoc, setEditorCtxMenu }: UseSnippetFlowOptions) {
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [showSnippetManager, setShowSnippetManager] = useState(false);

  const handleSnippetInsert = useCallback((_snippetId: string, resolved: { text: string; cursorPosition: number | null }) => {
    const view = cmViewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: resolved.text },
      selection: { anchor: resolved.cursorPosition !== null ? pos + resolved.cursorPosition : pos + resolved.text.length },
    });
    updateActiveDoc(resolved.text);
    view.focus();
  }, [cmViewRef, updateActiveDoc]);

  const openSnippetPicker = useCallback(() => {
    setEditorCtxMenu(null);
    setShowSnippetPicker(true);
  }, [setEditorCtxMenu]);

  return {
    showSnippetPicker, setShowSnippetPicker,
    showSnippetManager, setShowSnippetManager,
    handleSnippetInsert,
    openSnippetPicker,
  };
}
