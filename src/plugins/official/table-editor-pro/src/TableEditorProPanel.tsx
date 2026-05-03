/**
 * TableEditorProPanel — Visual table editing panel for the sidebar.
 *
 * Renders an interactive grid showing the current table data with buttons
 * for row/column operations and alignment toggling.
 */
import React, { useState, useCallback, useMemo } from 'react';
import type { PluginContext } from '../../../../plugins/plugin-sandbox';
import type { TableData, Alignment } from '../../../../lib/markdown/table-parser';
import { parseTable, serializeTable } from '../../../../lib/markdown/table-parser';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  state: {
    data: TableData | null;
    selectedRows: Set<number>;
  };
  context: PluginContext;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function findTableAtCursor(content: string, cursorOffset: number): TableData | null {
  for (const offset of [cursorOffset, cursorOffset - 1, cursorOffset + 1]) {
    const result = parseTable(content, Math.max(0, offset));
    if (result) return result;
  }
  return null;
}

function insertRow(data: TableData, afterIndex: number): TableData {
  const colCount = Math.max(data.headers[0]?.length ?? 0, ...data.rows.map((r: string[]) => r.length));
  const rows = [...data.rows];
  rows.splice(afterIndex + 1, 0, Array.from({ length: colCount }, () => ''));
  return { ...data, rows };
}

function deleteRows(data: TableData, indices: number[]): TableData {
  const set = new Set(indices);
  return { ...data, rows: data.rows.filter((_: string[], i: number) => !set.has(i)) };
}

function insertColumn(data: TableData, afterIndex: number): TableData {
  const headers = data.headers.map((h: string[]) => { const c = [...h]; c.splice(afterIndex + 1, 0, ''); return c; });
  const rows = data.rows.map((r: string[]) => { const c = [...r]; c.splice(afterIndex + 1, 0, ''); return c; });
  const alignment = [...data.alignment]; alignment.splice(afterIndex + 1, 0, 'left');
  return { ...data, headers, rows, alignment };
}

function deleteColumn(data: TableData, index: number): TableData {
  return {
    ...data,
    headers: data.headers.map((h: string[]) => h.filter((_: string, i: number) => i !== index)),
    rows: data.rows.map((r: string[]) => r.filter((_: string, i: number) => i !== index)),
    alignment: data.alignment.filter((_: Alignment, i: number) => i !== index),
  };
}

function setColumnAlignment(data: TableData, col: number, align: Alignment): TableData {
  const alignment = [...data.alignment];
  while (alignment.length <= col) alignment.push('left');
  alignment[col] = align;
  return { ...data, alignment };
}

function sortTableByColumn(data: TableData, col: number, dir: 'asc' | 'desc'): TableData {
  const sorted = [...data.rows].sort((a: string[], b: string[]) => {
    const cmp = (a[col] ?? '').localeCompare(b[col] ?? '', undefined, { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
  return { ...data, rows: sorted };
}

function updateCell(data: TableData, rowIdx: number, colIdx: number, value: string): TableData {
  const rows = data.rows.map((r: string[], i: number) => {
    if (i !== rowIdx) return r;
    const row = [...r];
    while (row.length <= colIdx) row.push('');
    row[colIdx] = value;
    return row;
  });
  return { ...data, rows };
}

function updateHeader(data: TableData, colIdx: number, value: string): TableData {
  const headers = data.headers.map((h: string[]) => {
    const row = [...h];
    while (row.length <= colIdx) row.push('');
    row[colIdx] = value;
    return row;
  });
  return { ...data, headers };
}

function writeBack(context: PluginContext, data: TableData): void {
  const content = context.editor.getContent();
  const before = content.slice(0, data.rawStart);
  const after = content.slice(data.rawEnd);
  const newContent = before + serializeTable(data) + after;
  context.editor.replaceRange(0, content.length, newContent);
}

const ALIGN_LABEL: Record<Alignment, string> = { left: '左', center: '中', right: '右' };
const NEXT_ALIGN: Record<Alignment, Alignment> = { left: 'center', center: 'right', right: 'left' };

const cellStyle: React.CSSProperties = {
  border: '1px solid var(--border, #e0e0e0)',
  padding: '3px 5px',
  fontSize: 12,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TableEditorProPanel({ state, context }: Props): React.ReactNode {
  const [localData, setLocalData] = useState<TableData | null>(null);
  const [sortCol, setSortCol] = useState(-1);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const table = localData ?? state.data;

  const loadFromEditor = useCallback(() => {
    const content = context.editor.getContent();
    const pos = context.editor.getCursorPosition().offset;
    const found = findTableAtCursor(content, pos);
    if (found) {
      setLocalData(found);
      setSelectedRows(new Set());
      setSortCol(-1);
    }
  }, [context]);

  const applyAndWrite = useCallback((newData: TableData) => {
    setLocalData(newData);
    writeBack(context, newData);
  }, [context]);

  const colCount = useMemo(() => {
    if (!table) return 0;
    return Math.max(table.headers[0]?.length ?? 0, ...table.rows.map((r: string[]) => r.length));
  }, [table]);

  if (!table) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary, #888)', fontSize: 13 }}>
        <p>将光标移到表格内，然后点击下方按钮加载。</p>
        <button
          onClick={loadFromEditor}
          style={{
            marginTop: 8, padding: '6px 14px', cursor: 'pointer',
            borderRadius: 4, border: '1px solid var(--border, #ddd)',
            background: 'var(--bg-secondary, #f5f5f5)',
          }}
        >
          加载当前表格
        </button>
      </div>
    );
  }

  const toggleRow = (idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div style={{ padding: 12, fontSize: 13, overflow: 'auto' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid var(--border, #eee)',
      }}>
        <button onClick={loadFromEditor} title="重新加载">🔄 刷新</button>
        <button onClick={() => applyAndWrite(insertRow(table, table.rows.length - 1))}>＋行</button>
        <button onClick={() => applyAndWrite(insertColumn(table, colCount - 1))}>＋列</button>
        <button
          onClick={() => {
            if (selectedRows.size > 0) applyAndWrite(deleteRows(table, [...selectedRows]));
            setSelectedRows(new Set());
          }}
          disabled={selectedRows.size === 0}
          title="删除选中行"
        >🗑 行</button>
        <button
          onClick={() => {
            if (colCount > 1) applyAndWrite(deleteColumn(table, colCount - 1));
          }}
          disabled={colCount <= 1}
          title="删除最后一列"
        >🗑 列</button>
        <button
          onClick={() => {
            const dir = sortCol === 0 && sortDir === 'asc' ? 'desc' : 'asc';
            setSortDir(dir); setSortCol(0);
            applyAndWrite(sortTableByColumn(table, 0, dir));
          }}
        >🔄 排序</button>
      </div>

      {/* Table Grid */}
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={cellStyle}>#</th>
            {table.headers[0].map((h: string, ci: number) => (
              <th
                key={ci}
                style={{
                  ...cellStyle,
                  textAlign: table.alignment[ci] ?? 'left',
                  cursor: 'pointer',
                  minWidth: 60,
                }}
                onClick={() => {
                  const a = (table.alignment[ci] ?? 'left');
                  const next = NEXT_ALIGN[a];
                  applyAndWrite(setColumnAlignment(table, ci, next));
                }}
                title={`对齐: ${ALIGN_LABEL[table.alignment[ci] ?? 'left']} (点击切换)`}
              >
                <input
                  value={h}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => applyAndWrite(updateHeader(table, ci, e.target.value))}
                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'inherit', fontSize: 12 }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row: string[], ri: number) => (
            <tr
              key={ri}
              style={{
                background: selectedRows.has(ri)
                  ? 'var(--accent-bg, rgba(99,102,241,0.1))'
                  : ri % 2 === 0 ? 'transparent' : 'var(--bg-secondary, #fafafa)',
                cursor: 'pointer',
              }}
              onClick={() => toggleRow(ri)}
            >
              <td style={{ ...cellStyle, color: 'var(--text-secondary, #aaa)', width: 24, textAlign: 'center' }}>
                {ri + 1}
              </td>
              {Array.from({ length: colCount }, (_: unknown, ci: number) => (
                <td key={ci} style={{ ...cellStyle, textAlign: table.alignment[ci] ?? 'left' }}>
                  <input
                    value={row[ci] ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => applyAndWrite(updateCell(table, ri, ci, e.target.value))}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'inherit', fontSize: 12 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Info */}
      <div style={{ marginTop: 8, color: 'var(--text-secondary, #888)', fontSize: 11 }}>
        {table.rows.length} 行 × {colCount} 列 · 选中 {selectedRows.size} 行
      </div>
    </div>
  );
}
