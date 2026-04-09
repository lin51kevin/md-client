import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Check } from 'lucide-react';
import type { TableData, Alignment } from '../lib/table-parser';
import { serializeTable } from '../lib/table-parser';

interface TableEditorProps {
  table: TableData;
  onConfirm: (newTableMarkdown: string) => void;
  onCancel: () => void;
}

export function TableEditor({ table, onConfirm, onCancel }: TableEditorProps) {
  const [headers, setHeaders] = useState<string[][]>(() => [table.headers[0]?.map((c) => c) ?? []]);
  const [rows, setRows] = useState<string[][]>(() => table.rows.map((r) => [...r]));
  const [alignment, setAlignment] = useState<Alignment[]>(() => [...table.alignment]);
  const modalRef = useRef<HTMLDivElement>(null);

  const colCount = Math.max(headers[0]?.length ?? 0, ...rows.map((r) => r.length), alignment.length);

  // Ensure consistent column count
  const ensureCols = useCallback((arr: string[][], cols: number) => {
    return arr.map((row) => {
      const r = [...row];
      while (r.length < cols) r.push('');
      return r;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onCancel();
    };
    // Delay to prevent immediate trigger from the edit button click
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onCancel]);

  const updateHeader = useCallback((colIdx: number, value: string) => {
    setHeaders((prev) => {
      const h = [...prev];
      h[0] = [...(h[0] ?? [])];
      while (h[0].length <= colIdx) h[0].push('');
      h[0][colIdx] = value;
      return h;
    });
  }, []);

  const updateCell = useCallback((rowIdx: number, colIdx: number, value: string) => {
    setRows((prev) => {
      const r = prev.map((row) => [...row]);
      while (r.length <= rowIdx) r.push([]);
      while (r[rowIdx].length <= colIdx) r[rowIdx].push('');
      r[rowIdx][colIdx] = value;
      return r;
    });
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => {
      const newRow = Array(colCount).fill('');
      return [...prev, newRow];
    });
  }, [colCount]);

  const removeRow = useCallback((idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addCol = useCallback(() => {
    setHeaders((prev) => {
      const h = prev.map((hr) => [...hr, '']);
      return h;
    });
    setRows((prev) => prev.map((r) => [...r, '']));
    setAlignment((prev) => [...prev, 'left']);
  }, []);

  const removeCol = useCallback((idx: number) => {
    setHeaders((prev) => prev.map((hr) => hr.filter((_, i) => i !== idx)));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== idx)));
    setAlignment((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const cycleAlignment = useCallback((colIdx: number) => {
    setAlignment((prev) => {
      const a = [...prev];
      while (a.length <= colIdx) a.push('left');
      const order: Alignment[] = ['left', 'center', 'right'];
      const current = a[colIdx] || 'left';
      a[colIdx] = order[(order.indexOf(current) + 1) % order.length];
      return a;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const data: TableData = {
      headers,
      rows: ensureCols(rows, Math.max(headers[0]?.length ?? 0)),
      alignment,
      rawStart: table.rawStart,
      rawEnd: table.rawEnd,
    };
    onConfirm(serializeTable(data));
  }, [headers, rows, alignment, table.rawStart, table.rawEnd, onConfirm, ensureCols]);

  const currentColCount = Math.max(headers[0]?.length ?? 0, ...rows.map((r) => r.length), alignment.length);

  // Render alignment icon
  const AlignIcon = ({ align }: { align: Alignment }) => {
    switch (align) {
      case 'center': return <AlignCenter size={14} />;
      case 'right': return <AlignRight size={14} />;
      default: return <AlignLeft size={14} />;
    }
  };

  return (
    <div className="table-editor-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="table-editor-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="table-editor-header">
          <span className="table-editor-title">✏️ 编辑表格</span>
          <button className="table-editor-icon-btn" onClick={onCancel} title="关闭">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="table-editor-toolbar">
          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={addRow} title="添加行">
              <Plus size={14} /> 行
            </button>
            <button className="toolbar-btn" onClick={() => rows.length > 0 && removeRow(rows.length - 1)} disabled={rows.length === 0} title="删除末行">
              <Trash2 size={14} /> 行
            </button>
            <span className="toolbar-sep" />
            <button className="toolbar-btn" onClick={addCol} title="添加列">
              <Plus size={14} /> 列
            </button>
            <button className="toolbar-btn" onClick={() => currentColCount > 0 && removeCol(currentColCount - 1)} disabled={currentColCount === 0} title="删除末列">
              <Trash2 size={14} /> 列
            </button>
          </div>
        </div>

        {/* Table Grid */}
        <div className="table-editor-grid-wrap">
          <table className="table-editor-grid">
            <thead>
              <tr>
                <th className="col-actions-header"></th>
                {Array.from({ length: currentColCount }).map((_, ci) => (
                  <th key={`h-${ci}`} className="editor-th">
                    <input
                      className="editor-cell-input"
                      value={headers[0]?.[ci] ?? ''}
                      onChange={(e) => updateHeader(ci, e.target.value)}
                      placeholder={`表头 ${ci + 1}`}
                    />
                    <button
                      className="align-btn"
                      onClick={() => cycleAlignment(ci)}
                      title={`对齐: ${alignment[ci] || 'left'}`}
                    >
                      <AlignIcon align={alignment[ci] || 'left'} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={`r-${ri}`}>
                  <td className="row-actions-cell">
                    <button
                      className="row-delete-btn"
                      onClick={() => removeRow(ri)}
                      title="删除此行"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                  {Array.from({ length: currentColCount }).map((_, ci) => (
                    <td key={`c-${ri}-${ci}`}>
                      <textarea
                        className="editor-cell-input editor-textarea"
                        value={row[ci] ?? ''}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        placeholder=""
                        rows={1}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={currentColCount + 1} className="empty-table-hint">
                    暂无数据行，点击上方"添加行"按钮添加
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="table-editor-footer">
          <button className="btn-cancel" onClick={onCancel}>取消</button>
          <button className="btn-confirm" onClick={handleConfirm}>
            <Check size={16} /> 确定
          </button>
        </div>
      </div>
    </div>
  );
}
