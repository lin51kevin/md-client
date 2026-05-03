/**
 * Table Editor Pro — enhanced table editing plugin for MarkLite.
 *
 * Extends the built-in table editor with:
 *  1. Column alignment toggle via context menu
 *  2. Row sort by column (asc / desc)
 *  3. Batch row operations (insert / delete / move)
 *  4. Draggable column widths in preview
 *  5. Floating toolbar for common table operations
 */
import type { PluginContext } from '../../../../plugins/plugin-sandbox';
import type { Disposable } from '../../../../plugins/types';
import type { TableData, Alignment } from '../../../../lib/markdown/table-parser';
import { parseTable, serializeTable } from '../../../../lib/markdown/table-parser';
import { TableEditorProPanel } from './TableEditorProPanel';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface TableProState {
  data: TableData | null;
  sortCol: number;
  sortDir: 'asc' | 'desc';
  selectedRows: Set<number>;
}

function createState(): TableProState {
  return { data: null, sortCol: -1, sortDir: 'asc', selectedRows: new Set() };
}

/** Detect the cursor is inside a table block in editor content. */
function findTableAtCursor(content: string, cursorOffset: number): TableData | null {
  for (const offset of [cursorOffset, cursorOffset - 1, cursorOffset + 1]) {
    const result = parseTable(content, Math.max(0, offset));
    if (result) return result;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Column sort                                                        */
/* ------------------------------------------------------------------ */

function sortTableByColumn(data: TableData, col: number, dir: 'asc' | 'desc'): TableData {
  const sorted = [...data.rows].sort((a: string[], b: string[]) => {
    const cmp = (a[col] ?? '').localeCompare(b[col] ?? '', undefined, { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
  return { ...data, rows: sorted };
}

/* ------------------------------------------------------------------ */
/*  Row operations                                                     */
/* ------------------------------------------------------------------ */

function insertRow(data: TableData, afterIndex: number): TableData {
  const colCount = Math.max(data.headers[0]?.length ?? 0, ...data.rows.map((r: string[]) => r.length));
  const emptyRow = Array.from({ length: colCount }, () => '');
  const rows = [...data.rows];
  rows.splice(afterIndex + 1, 0, emptyRow);
  return { ...data, rows };
}

function deleteRows(data: TableData, indices: number[]): TableData {
  const set = new Set(indices);
  const rows = data.rows.filter((_: string[], i: number) => !set.has(i));
  return { ...data, rows };
}

function moveRow(data: TableData, from: number, to: number): TableData {
  const rows = [...data.rows];
  const [moved] = rows.splice(from, 1);
  rows.splice(to, 0, moved);
  return { ...data, rows };
}

/* ------------------------------------------------------------------ */
/*  Column operations                                                  */
/* ------------------------------------------------------------------ */

function insertColumn(data: TableData, afterIndex: number): TableData {
  const headers = data.headers.map((h: string[]) => {
    const copy = [...h];
    copy.splice(afterIndex + 1, 0, '');
    return copy;
  });
  const rows = data.rows.map((r: string[]) => {
    const copy = [...r];
    copy.splice(afterIndex + 1, 0, '');
    return copy;
  });
  const alignment = [...data.alignment];
  alignment.splice(afterIndex + 1, 0, 'left');
  return { ...data, headers, rows, alignment };
}

function deleteColumn(data: TableData, index: number): TableData {
  const headers = data.headers.map((h: string[]) => h.filter((_: string, i: number) => i !== index));
  const rows = data.rows.map((r: string[]) => r.filter((_: string, i: number) => i !== index));
  const alignment = data.alignment.filter((_: Alignment, i: number) => i !== index);
  return { ...data, headers, rows, alignment };
}

function setAlignment(data: TableData, col: number, align: Alignment): TableData {
  const alignment = [...data.alignment];
  while (alignment.length <= col) alignment.push('left');
  alignment[col] = align;
  return { ...data, alignment };
}

/* ------------------------------------------------------------------ */
/*  Draggable column-width CSS injection                                */
/* ------------------------------------------------------------------ */

function injectColumnResizeCSS(): Disposable {
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

/* ------------------------------------------------------------------ */
/*  Context menu action factory                                        */
/* ------------------------------------------------------------------ */

function tableAction(
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

/* ------------------------------------------------------------------ */
/*  Plugin activate                                                    */
/* ------------------------------------------------------------------ */

export async function activate(context: PluginContext) {
  const state = createState();
  const disposables: Disposable[] = [];

  // --- Inject CSS for column resize ---
  disposables.push(injectColumnResizeCSS());

  // --- Context menu items for tables ---
  disposables.push(
    context.contextMenu.addItem({
      id: 'table-pro.align-left',
      label: '列左对齐',
      icon: 'align-left',
      group: 'table',
      order: 10,
      action: tableAction(state, context.editor, t => setAlignment(t, 0, 'left')),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.align-center',
      label: '列居中对齐',
      icon: 'align-center',
      group: 'table',
      order: 11,
      action: tableAction(state, context.editor, t => setAlignment(t, 0, 'center')),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.align-right',
      label: '列右对齐',
      icon: 'align-right',
      group: 'table',
      order: 12,
      action: tableAction(state, context.editor, t => setAlignment(t, 0, 'right')),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.insert-row',
      label: '插入行',
      icon: 'plus',
      group: 'table',
      order: 20,
      action: tableAction(state, context.editor, t =>
        insertRow(t, state.selectedRows.size > 0 ? Math.max(...state.selectedRows) : t.rows.length - 1)
      ),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.delete-row',
      label: '删除选中行',
      icon: 'trash-2',
      group: 'table',
      order: 21,
      action: () => {
        const content = context.editor.getContent();
        const pos = context.editor.getCursorPosition().offset;
        const table = findTableAtCursor(content, pos);
        if (!table || table.rows.length === 0) return;
        const indices = state.selectedRows.size > 0 ? [...state.selectedRows] : [0];
        const updated = deleteRows(table, indices);
        context.editor.replaceRange(table.rawStart, table.rawEnd, serializeTable(updated));
        state.data = updated;
        state.selectedRows.clear();
      },
    }),
    context.contextMenu.addItem({
      id: 'table-pro.insert-col',
      label: '插入列',
      icon: 'columns',
      group: 'table',
      order: 30,
      action: tableAction(state, context.editor, t =>
        insertColumn(t, t.headers[0].length - 1)
      ),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.delete-col',
      label: '删除最后一列',
      icon: 'minus',
      group: 'table',
      order: 31,
      action: tableAction(state, context.editor, t =>
        t.headers[0].length <= 1 ? t : deleteColumn(t, t.headers[0].length - 1)
      ),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.sort-asc',
      label: '升序排列',
      icon: 'arrow-up-narrow-wide',
      group: 'table',
      order: 40,
      action: tableAction(state, context.editor, t => sortTableByColumn(t, 0, 'asc')),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.sort-desc',
      label: '降序排列',
      icon: 'arrow-down-wide-narrow',
      group: 'table',
      order: 41,
      action: tableAction(state, context.editor, t => sortTableByColumn(t, 0, 'desc')),
    }),
    context.contextMenu.addItem({
      id: 'table-pro.move-up',
      label: '上移行',
      icon: 'arrow-up',
      group: 'table',
      order: 50,
      action: () => {
        const content = context.editor.getContent();
        const pos = context.editor.getCursorPosition().offset;
        const table = findTableAtCursor(content, pos);
        if (!table || state.selectedRows.size === 0) return;
        const minRow = Math.min(...state.selectedRows);
        if (minRow === 0) return;
        const updated = moveRow(table, minRow, minRow - 1);
        context.editor.replaceRange(table.rawStart, table.rawEnd, serializeTable(updated));
        state.selectedRows.clear();
        state.selectedRows.add(minRow - 1);
        state.data = updated;
      },
    }),
    context.contextMenu.addItem({
      id: 'table-pro.move-down',
      label: '下移行',
      icon: 'arrow-down',
      group: 'table',
      order: 51,
      action: () => {
        const content = context.editor.getContent();
        const pos = context.editor.getCursorPosition().offset;
        const table = findTableAtCursor(content, pos);
        if (!table || state.selectedRows.size === 0) return;
        const maxRow = Math.max(...state.selectedRows);
        if (maxRow >= table.rows.length - 1) return;
        const updated = moveRow(table, maxRow, maxRow + 1);
        context.editor.replaceRange(table.rawStart, table.rawEnd, serializeTable(updated));
        state.selectedRows.clear();
        state.selectedRows.add(maxRow + 1);
        state.data = updated;
      },
    }),
  );

  // --- Sidebar panel for visual table editing ---
  const panelDisposable = context.sidebar.registerPanel('table-editor-pro', {
    title: '表格编辑器 Pro',
    icon: 'table',
    render: () => TableEditorProPanel({ state, context }),
  });
  disposables.push(panelDisposable);

  // --- Commands ---
  disposables.push(
    context.commands.register('table-pro.open', () => {
      context.ui.showMessage('表格编辑器 Pro：在侧边栏中编辑表格', 'info');
    }),
  );

  return {
    deactivate: () => {
      disposables.forEach(d => d.dispose());
      state.data = null;
      state.selectedRows.clear();
    },
  };
}
