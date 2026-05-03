/**
 * BottomPanelContainer — VS Code-style bottom panel.
 *
 * Renders plugin panels with position='bottom' in a resizable area
 * at the bottom of the editor. Supports drag-to-resize from the top edge.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'marklite.bottom-panel-height.v1';
const DEFAULT_HEIGHT = 220;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 500;

function getSavedHeight(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HEIGHT;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < MIN_HEIGHT || n > MAX_HEIGHT) return DEFAULT_HEIGHT;
    return n;
  } catch {
    return DEFAULT_HEIGHT;
  }
}

interface BottomPanelContainerProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomPanelContainer({ visible, title, onClose, children }: BottomPanelContainerProps) {
  const [height, setHeight] = useState<number>(getSavedHeight);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartH = useRef<number>(0);

  const saveHeight = useCallback((h: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(h));
    } catch {
      // ignore
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartH.current = height;
    setDragging(true);
  }, [height]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      if (e.buttons === 0) {
        const final = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current));
        setHeight(final);
        saveHeight(final);
        setDragging(false);
        return;
      }
      // Dragging up increases height
      const delta = dragStartY.current - e.clientY;
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta));
      setHeight(next);
    };

    const onUp = (e: MouseEvent) => {
      const delta = dragStartY.current - e.clientY;
      const final = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta));
      setHeight(final);
      saveHeight(final);
      setDragging(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, saveHeight]);

  if (!visible) return null;

  return (
    <div
      className="shrink-0 relative flex flex-col"
      style={{
        height,
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        pointerEvents: dragging ? 'none' : undefined,
      }}
    >
      {/* Top resize handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -3,
          height: 6,
          cursor: 'row-resize',
          zIndex: 10,
        }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: 32,
          borderBottom: '1px solid var(--border-color)',
          userSelect: 'none',
        }}
      >
        <span
          className="font-semibold text-xs uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {title}
        </span>
        <div className="flex items-center gap-1">
          {/* Portal target for plugin-contributed header actions */}
          <div data-bottom-panel-actions="true" className="flex items-center" />
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              width: 24,
              height: 24,
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-hidden"
        style={{ pointerEvents: dragging ? 'none' : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
