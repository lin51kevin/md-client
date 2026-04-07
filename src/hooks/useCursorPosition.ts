import { useState } from 'react';
import { EditorView } from '@codemirror/view';

export function useCursorPosition() {
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  const cursorExtension = EditorView.updateListener.of((update) => {
    if (update.selectionSet || update.docChanged) {
      const state = update.state;
      const head = state.selection.main.head;
      const line = state.doc.lineAt(head);
      setCursorPos({ line: line.number, col: head - line.from + 1 });
    }
  });

  return { cursorPos, cursorExtension };
}
