import { useCallback, useEffect, useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';

/* ── Constants ────────────────────────────────────────────── */
const STORAGE_KEY = 'marklite-floating-panel';
const MIN_W = 320;
const MIN_H = 360;
const DEFAULT_W = 400;
const DEFAULT_H = 560;

interface PanelRect { x: number; y: number; w: number; h: number }

function loadRect(): PanelRect {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use default */ }
  return {
    x: Math.max(0, window.innerWidth - DEFAULT_W - 16),
    y: Math.max(0, window.innerHeight - DEFAULT_H - 48),
    w: DEFAULT_W,
    h: DEFAULT_H,
  };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ── Component ────────────────────────────────────────────── */
interface FloatingPanelProps {
  visible: boolean;
  children: (dragHandle: (e: ReactMouseEvent) => void) => ReactNode;
}

export function FloatingPanel({ visible, children }: FloatingPanelProps) {
  const [rect, setRect] = useState<PanelRect>(loadRect);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ edge: string; sx: number; sy: number; origin: PanelRect } | null>(null);

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rect)); }, [rect]);

  // Clamp on viewport resize
  useEffect(() => {
    const onResize = () => setRect(r => ({
      ...r,
      x: clamp(r.x, 0, window.innerWidth - 100),
      y: clamp(r.y, 0, window.innerHeight - 40),
    }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Drag (title bar) ──────────────────────────────────── */
  const onDragStart = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: rectRef.current.x, oy: rectRef.current.y };
  }, []);

  /* ── Resize (edges / corners) ──────────────────────────── */
  const onResizeStart = useCallback((e: ReactMouseEvent, edge: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { edge, sx: e.clientX, sy: e.clientY, origin: { ...rectRef.current } };
  }, []);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (dragRef.current) {
        const d = dragRef.current;
        setRect(r => ({
          ...r,
          x: clamp(d.ox + e.clientX - d.sx, 0, window.innerWidth - 100),
          y: clamp(d.oy + e.clientY - d.sy, 0, window.innerHeight - 40),
        }));
      }
      if (resizeRef.current) {
        const { edge, sx, sy, origin } = resizeRef.current;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        setRect(() => {
          const n = { ...origin };
          if (edge.includes('r')) n.w = Math.max(MIN_W, origin.w + dx);
          if (edge.includes('b')) n.h = Math.max(MIN_H, origin.h + dy);
          if (edge.includes('l')) { const w = Math.max(MIN_W, origin.w - dx); n.x = origin.x + origin.w - w; n.w = w; }
          if (edge.includes('t')) { const h = Math.max(MIN_H, origin.h - dy); n.y = origin.y + origin.h - h; n.h = h; }
          return n;
        });
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const E = 5; // edge handle size
  const C = 14; // corner handle size
  const handles: { id: string; cursor: string; style: React.CSSProperties }[] = [
    { id: 'r',  cursor: 'ew-resize',   style: { top: C, right: 0, bottom: C, width: E } },
    { id: 'b',  cursor: 'ns-resize',   style: { left: C, right: C, bottom: 0, height: E } },
    { id: 'l',  cursor: 'ew-resize',   style: { top: C, left: 0, bottom: C, width: E } },
    { id: 't',  cursor: 'ns-resize',   style: { left: C, right: C, top: 0, height: E } },
    { id: 'rb', cursor: 'nwse-resize', style: { right: 0, bottom: 0, width: C, height: C } },
    { id: 'lb', cursor: 'nesw-resize', style: { left: 0, bottom: 0, width: C, height: C } },
    { id: 'rt', cursor: 'nesw-resize', style: { right: 0, top: 0, width: C, height: C } },
    { id: 'lt', cursor: 'nwse-resize', style: { left: 0, top: 0, width: C, height: C } },
  ];

  // Use display:none instead of returning null to preserve child component
  // state (e.g. AI chat messages) across visibility toggles (slide/mindmap mode).
  return (
    <div data-testid="floating-panel-root" style={{
      position: 'fixed', left: rect.x, top: rect.y, width: rect.w, height: rect.h,
      zIndex: 10000, display: visible ? 'flex' : 'none', flexDirection: 'column',
      borderRadius: 8, border: '1px solid var(--border-color)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      backgroundColor: 'var(--bg-secondary)',
      overflow: 'hidden',
    }}>
      {/* Content — child receives dragHandle callback */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children(onDragStart)}
      </div>

      {/* Resize handles */}
      {handles.map(({ id, cursor, style }) => (
        <div
          key={id}
          onMouseDown={e => onResizeStart(e, id)}
          style={{ position: 'absolute', ...style, cursor, zIndex: 1 }}
        />
      ))}
    </div>
  );
}
