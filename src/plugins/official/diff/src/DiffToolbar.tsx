import React, { useCallback, useRef, useState } from 'react';
import {
  ArrowLeftRight, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  ListFilter, Pilcrow, CaseSensitive, Link2, X, GripHorizontal,
} from 'lucide-react';
import type { DiffStats } from './diff-core';
import type { DiffViewOptions } from './types';
import type { DiffT } from './i18n';

/** Display just the file name (keep the full path for the tooltip). */
function basename(p: string): string {
  return p.split(/[/\\]/).pop() || p;
}

interface DiffToolbarProps {
  t: DiffT;
  nameA: string;
  nameB: string;
  stats: DiffStats;
  /** 1-based index of the currently focused diff block, 0 when none. */
  current: number;
  total: number;
  options: DiffViewOptions;
  onToggle: (key: keyof DiffViewOptions) => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onSwap: () => void;
  onClose: () => void;
}

const BTN_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 26,
  border: 'none',
  borderRadius: 5,
  backgroundColor: 'transparent',
  color: 'var(--text-secondary, #cbd5e1)',
  cursor: 'pointer',
  flexShrink: 0,
};

const Divider: React.FC = () => (
  <span style={{ width: 1, height: 18, backgroundColor: 'var(--border-color, #3a3a4a)', margin: '0 4px', flexShrink: 0 }} />
);

interface IconButtonProps {
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({ title, onClick, active, disabled, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    style={{
      ...BTN_BASE,
      color: active ? 'var(--accent-color, #4a9eff)' : BTN_BASE.color,
      backgroundColor: active ? 'var(--bg-hover, rgba(74,158,255,0.14))' : 'transparent',
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? 'default' : 'pointer',
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.1))'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = active ? 'var(--bg-hover, rgba(74,158,255,0.14))' : 'transparent'; }}
  >
    {children}
  </button>
);

/**
 * Draggable floating toolbar for the diff overlay. Grouped into: sources,
 * statistics + counter, navigation, filter, options and close.
 */
export const DiffToolbar: React.FC<DiffToolbarProps> = ({
  t, nameA, nameB, stats, current, total, options,
  onToggle, onFirst, onPrev, onNext, onLast, onSwap, onClose,
}) => {
  const [pos, setPos] = useState<{ x: number | null; y: number }>({ x: null, y: 12 });
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = barRef.current?.getBoundingClientRect();
    const originX = rect ? rect.left : 0;
    drag.current = { startX: e.clientX, startY: e.clientY, originX, originY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!drag.current) return;
      const dx = ev.clientX - drag.current.startX;
      const dy = ev.clientY - drag.current.startY;
      const width = barRef.current?.offsetWidth ?? 0;
      const maxX = Math.max(0, window.innerWidth - width);
      const nextX = Math.min(maxX, Math.max(0, drag.current.originX + dx));
      const nextY = Math.min(window.innerHeight - 40, Math.max(0, drag.current.originY + dy));
      setPos({ x: nextX, y: nextY });
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
  }, [pos.y]);

  const hasDiffs = total > 0;

  return (
    <div
      ref={barRef}
      style={{
        position: 'absolute',
        top: pos.y,
        left: pos.x == null ? '50%' : pos.x,
        transform: pos.x == null ? 'translateX(-50%)' : 'none',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 6px',
        borderRadius: 10,
        border: '1px solid var(--border-color, #3a3a4a)',
        backgroundColor: 'var(--bg-tertiary, rgba(30,30,40,0.92))',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
        color: 'var(--text-primary, #e6e6e6)',
        fontSize: 12,
        maxWidth: 'calc(100vw - 24px)',
        userSelect: 'none',
      }}
    >
      {/* Drag handle */}
      <span onMouseDown={onDragStart} title="" style={{ ...BTN_BASE, width: 20, cursor: 'grab', color: 'var(--text-tertiary, #777)' }}>
        <GripHorizontal size={15} />
      </span>

      {/* Sources */}
      <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nameA}>{basename(nameA)}</span>
      <IconButton title={t('diff.swap')} onClick={onSwap}><ArrowLeftRight size={15} /></IconButton>
      <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nameB}>{basename(nameB)}</span>

      <Divider />

      {/* Statistics + counter */}
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--diff-add-text, #2ea043)' }}>+{stats.added}</span>
        <span style={{ color: 'var(--diff-del-text, #f85149)' }}>−{stats.removed}</span>
        <span style={{ color: 'var(--diff-mod-text, #d29922)' }}>~{stats.modified}</span>
        <span style={{ color: 'var(--text-tertiary, #888)' }}>[{hasDiffs ? current : 0}/{total}]</span>
      </span>

      <Divider />

      {/* Navigation */}
      <IconButton title={t('diff.firstDiff')} onClick={onFirst} disabled={!hasDiffs}><ChevronsUp size={16} /></IconButton>
      <IconButton title={t('diff.prevDiff')} onClick={onPrev} disabled={!hasDiffs}><ChevronUp size={16} /></IconButton>
      <IconButton title={t('diff.nextDiff')} onClick={onNext} disabled={!hasDiffs}><ChevronDown size={16} /></IconButton>
      <IconButton title={t('diff.lastDiff')} onClick={onLast} disabled={!hasDiffs}><ChevronsDown size={16} /></IconButton>

      <Divider />

      {/* Filter */}
      <IconButton title={t('diff.onlyDiffs')} onClick={() => onToggle('onlyDiffs')} active={options.onlyDiffs}><ListFilter size={16} /></IconButton>

      <Divider />

      {/* Options */}
      <IconButton title={t('diff.ignoreWhitespace')} onClick={() => onToggle('ignoreWhitespace')} active={options.ignoreWhitespace}><Pilcrow size={15} /></IconButton>
      <IconButton title={t('diff.ignoreCase')} onClick={() => onToggle('ignoreCase')} active={options.ignoreCase}><CaseSensitive size={16} /></IconButton>
      <IconButton title={t('diff.syncScroll')} onClick={() => onToggle('syncScroll')} active={options.syncScroll}><Link2 size={15} /></IconButton>

      <Divider />

      <IconButton title={t('diff.close')} onClick={onClose}><X size={16} /></IconButton>
    </div>
  );
};
