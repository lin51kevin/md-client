import { useMemo, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { useEditorStore } from '../stores/editor-store';

/**
 * useCursorPosition
 *
 * Returns a stable CodeMirror extension that writes the cursor position to
 * the editor-store (via getState — no subscription) throttled to one write
 * per animation frame.
 *
 * This removes the local useState that was previously causing AppShell
 * (and its entire subtree) to re-render on every keystroke / cursor move.
 * Only StatusBar, which subscribes to `useEditorStore(s => s.cursor)`,
 * re-renders when the position changes.
 */
export function useCursorPosition() {
  const rafPendingRef = useRef(false);

  const cursorExtension = useMemo(() => EditorView.updateListener.of((update) => {
    if (!update.selectionSet && !update.docChanged) return;

    // Throttle to one store write per animation frame
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;

    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      const state = update.view.state;
      const head = state.selection.main.head;
      const line = state.doc.lineAt(head);
      useEditorStore.getState().setCursor({
        line: line.number,
        col: head - line.from + 1,
      });
    });
  }), []); // no deps — stable extension for the lifetime of the hook

  return { cursorExtension };
}
