/**
 * Table Editor Pro — Utility functions
 */
import type { PluginContext } from '../../../../plugins/plugin-sandbox';
import type { Disposable } from '../../../../plugins/types';
import type { TableData } from '../../../../lib/markdown/table-parser';
import { parseTable, serializeTable } from '../../../../lib/markdown/table-parser';
import type { TableProState } from './table-state';

/** Detect the cursor is inside a table block in editor content. */
export function findTableAtCursor(content: string, cursorOffset: number): TableData | null {
  for (const offset of [cursorOffset, cursorOffset - 1, cursorOffset + 1]) {
    const result = parseTable(content, Math.max(0, offset));
    if (result) return result;
  }
  return null;
}

/** Inject CSS for draggable column-width handles */
export function injectColumnResizeCSS(): Disposable {
  const id = 'table-editor-pro-resize';
  if (document.getElementById(id)) return { dispose: () => {} };
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .table-editor-pro-resizable th { position: relative; user-select: none; }
    .table-editor-pro-resizable th .col-resize-handle {
      position: absolute; right: -3px; top: 0; bottom: 0; width: 6px;
      cursor: col-resize; background: transparent; z-index: 2;
    }
    .table-editor-pro-resizable th .col-resize-handle:hover,
    .table-editor-pro-resizable th .col-resize-handle.active {
      background: var(--accent, #6366f1);
    }
    .table-editor-pro-resizable th.resizing { background: var(--accent-bg, rgba(99,102,241,0.08)); }
  `;
  document.head.appendChild(style);
  return {
    dispose: () => { style.remove(); },
  };
}

/** Create a context menu action that applies a table transformation */
export function tableAction(
  state: TableProState,
  editor: PluginContext['editor'],
  fn: (table: TableData) => TableData,
): () => void {
  return () => {
    const content = editor.getContent();
    const pos = editor.getCursorPosition().offset;
    const table = findTableAtCursor(content, pos);
    if (!table) return;
    const updated = fn(table);
    editor.replaceRange(table.rawStart, table.rawEnd, serializeTable(updated));
    state.data = updated;
  };
}
