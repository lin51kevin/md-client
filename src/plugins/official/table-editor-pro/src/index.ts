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
import type { PluginContext } from '../../../plugin-sandbox';
import type { Disposable } from '../../../../plugins/types';
import { serializeTable } from '../../../../lib/markdown/table-parser';
import { TableEditorProPanel } from './TableEditorProPanel';
import { createState } from './table-state';
import {
  sortTableByColumn,
  insertRow,
  deleteRows,
  moveRow,
  insertColumn,
  deleteColumn,
  setAlignment,
} from './table-operations';
import { findTableAtCursor, injectColumnResizeCSS, tableAction } from './table-utils';

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
