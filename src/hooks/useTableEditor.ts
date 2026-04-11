import { useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { TableData } from '../lib/table-parser';

interface UseTableEditorOptions {
  cmViewRef: RefObject<EditorView | null>;
  updateActiveDoc: (doc: string) => void;
}

export function useTableEditor({ cmViewRef, updateActiveDoc }: UseTableEditorOptions) {
  const [editingTable, setEditingTable] = useState<TableData | null>(null);

  const handleTableConfirm = useCallback((newTableMarkdown: string) => {
    if (!editingTable) return;
    const view = cmViewRef.current;
    if (!view) return;
    const doc = view.state.doc.toString();
    const newContent =
      doc.slice(0, editingTable.rawStart) +
      newTableMarkdown +
      doc.slice(editingTable.rawEnd);
    view.dispatch({
      changes: { from: editingTable.rawStart, to: editingTable.rawEnd, insert: newTableMarkdown },
    });
    updateActiveDoc(newContent);
    setEditingTable(null);
  }, [editingTable, cmViewRef, updateActiveDoc]);

  return { editingTable, setEditingTable, handleTableConfirm };
}
