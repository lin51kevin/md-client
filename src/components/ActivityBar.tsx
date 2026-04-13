import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderTree, Search, List, GitBranch, Settings } from 'lucide-react';
import { useI18n, type TranslationKey } from '../i18n';
import { useLocalStorageString } from '../hooks/useLocalStorage';

export type PanelId = 'filetree' | 'search' | 'toc' | 'git';

interface ActivityBarProps {
  activePanel: PanelId | null;
  onPanelChange: (panel: PanelId | null) => void;
  onOpenSettings: () => void;
}

type PanelItem = { id: PanelId; icon: typeof FolderTree; titleKey: TranslationKey };

export const PANEL_ITEMS: PanelItem[] = [
  { id: 'filetree', icon: FolderTree, titleKey: 'toolbar.fileTree' },
  { id: 'toc',      icon: List,       titleKey: 'toolbar.toc' },
  { id: 'search',   icon: Search,     titleKey: 'toolbar.search' },
  { id: 'git',      icon: GitBranch,  titleKey: 'git.panel' },
];

const PANEL_MAP = new Map<PanelId, PanelItem>(PANEL_ITEMS.map(p => [p.id, p]));
const DEFAULT_ORDER = PANEL_ITEMS.map(p => p.id).join(',');
const ITEM_HEIGHT = 40;
const DRAG_THRESHOLD = 4; // px before a mousedown becomes a drag

function parseOrder(raw: string): PanelId[] {
  const saved = raw.split(',').filter((id): id is PanelId => PANEL_MAP.has(id as PanelId));
  const missing = PANEL_ITEMS.map(p => p.id).filter(id => !saved.includes(id));
  return [...saved, ...missing];
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function ActivityBar({ activePanel, onPanelChange, onOpenSettings }: ActivityBarProps) {
  const { t } = useI18n();
  const [orderRaw, setOrderRaw] = useLocalStorageString('marklite-panel-order', DEFAULT_ORDER);
  const [orderedIds, setOrderedIds] = useState<PanelId[]>(() => parseOrder(orderRaw));
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  /** Tracks the current mouse-down gesture; null when idle */
  const gestureRef = useRef<{
    index: number;
    id: PanelId;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const insertAtRef = useRef<number | null>(null);
  /** Set to true once drag threshold exceeded; checked by onClick to suppress toggle */
  const didDragRef = useRef(false);

  /** Reordered view shown while dragging */
  const displayIds = useMemo(() => {
    if (draggingFrom === null || insertAt === null || draggingFrom === insertAt) return orderedIds;
    return reorder(orderedIds, draggingFrom, insertAt);
  }, [orderedIds, draggingFrom, insertAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: PanelId, index: number) => {
    if (e.button !== 0) return;
    e.preventDefault(); // prevent text selection during drag
    didDragRef.current = false;
    gestureRef.current = { index, id, startY: e.clientY, dragging: false };
  }, []);

  // Always-on window listeners — cheaply bail out when gestureRef is null
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const g = gestureRef.current;
      if (!g) return;

      if (!g.dragging && Math.abs(e.clientY - g.startY) > DRAG_THRESHOLD) {
        g.dragging = true;
        didDragRef.current = true;
        insertAtRef.current = g.index;
        setDraggingFrom(g.index);
        setInsertAt(g.index);
      }

      if (g.dragging) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const slot = Math.max(0, Math.min(PANEL_ITEMS.length - 1, Math.floor(relY / ITEM_HEIGHT)));
        insertAtRef.current = slot;
        setInsertAt(slot);
      }
    };

    const onUp = () => {
      const g = gestureRef.current;
      if (!g) return;

      if (g.dragging) {
        const from = g.index;
        const to = insertAtRef.current ?? from;
        if (from !== to) {
          setOrderedIds(prev => {
            const next = reorder(prev, from, to);
            setOrderRaw(next.join(','));
            return next;
          });
        }
        setDraggingFrom(null);
        setInsertAt(null);
      }

      gestureRef.current = null;
      insertAtRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setOrderRaw]);

  return (
    <div
      ref={containerRef}
      className="shrink-0 flex flex-col items-center select-none"
      style={{
        width: 44,
        backgroundColor: 'var(--bg-tertiary)',
        borderRight: '1px solid var(--border-color)',
        cursor: draggingFrom !== null ? 'grabbing' : 'default',
      }}
    >
      {/* Panel icons — drag to reorder */}
      {displayIds.map((id) => {
        const item = PANEL_MAP.get(id);
        if (!item) return null;
        const { icon: Icon, titleKey } = item;
        const isActive = activePanel === id;
        const originalIndex = orderedIds.indexOf(id);
        const isDraggingThis = draggingFrom !== null && originalIndex === gestureRef.current?.index;
        return (
          <button
            key={id}
            title={t(titleKey)}
            onMouseDown={(e) => handleMouseDown(e, id, orderedIds.indexOf(id))}
            onClick={() => { if (!didDragRef.current) onPanelChange(activePanel === id ? null : id); }}
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: ITEM_HEIGHT,
              color: isActive ? 'var(--accent-color)' : 'var(--text-tertiary)',
              backgroundColor: isDraggingThis ? 'var(--hover-bg, rgba(0,0,0,0.08))' : 'transparent',
              border: 'none',
              borderLeft: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
              cursor: draggingFrom !== null ? 'grabbing' : 'grab',
              opacity: isDraggingThis ? 0.6 : 1,
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive && draggingFrom === null) e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <Icon size={20} strokeWidth={1.6} />
          </button>
        );
      })}

      {/* Bottom spacer + Settings */}
      <div className="mt-auto mb-1">
        <button
          title={t('settings.title')}
          onClick={onOpenSettings}
          className="flex items-center justify-center transition-colors"
          style={{
            width: 44,
            height: 40,
            color: 'var(--text-tertiary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderLeft: '2px solid transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <Settings size={20} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}



