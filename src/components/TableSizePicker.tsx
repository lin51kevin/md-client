/**
 * TableSizePicker — 表格尺寸网格选择器
 *
 * 鼠标悬停高亮行列，点击后回调选中的行列数。
 * 作为 Toolbar 按钮的下拉弹出层使用。
 */
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n';

interface TableSizePickerProps {
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}

const MAX_SIZE = 8;
const DEFAULT_SIZE = 5;

export function TableSizePicker({ onSelect, onClose }: TableSizePickerProps) {
  const { t } = useI18n();
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Expand grid when hovering near edge
  const visibleRows = Math.max(DEFAULT_SIZE, Math.min(hoverRow + 1, MAX_SIZE));
  const visibleCols = Math.max(DEFAULT_SIZE, Math.min(hoverCol + 1, MAX_SIZE));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded shadow-lg p-2"
      style={{
        top: '100%',
        left: 0,
        marginTop: 4,
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      }}
      onMouseLeave={() => { setHoverRow(0); setHoverCol(0); }}
    >
      <div
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${visibleCols}, 1fr)`,
        }}
      >
        {Array.from({ length: visibleRows }, (_, r) =>
          Array.from({ length: visibleCols }, (_, c) => {
            const isHighlighted = r < hoverRow && c < hoverCol;
            return (
              <div
                key={`${r}-${c}`}
                className="w-5 h-5 rounded-sm cursor-pointer transition-colors"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: isHighlighted
                    ? 'var(--accent-color)'
                    : 'var(--bg-secondary)',
                  opacity: isHighlighted ? 0.7 : 1,
                }}
                onMouseEnter={() => { setHoverRow(r + 1); setHoverCol(c + 1); }}
                onClick={() => { onSelect(r + 1, c + 1); onClose(); }}
              />
            );
          })
        )}
      </div>
      <div
        className="text-center mt-1.5 text-xs select-none"
        style={{ color: 'var(--text-secondary)' }}
      >
        {hoverRow > 0 && hoverCol > 0
          ? t('toolbar.tableSize', { rows: hoverRow, cols: hoverCol })
          : t('toolbar.table')}
      </div>
    </div>
  );
}
