import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTerminalManager } from './useTerminalManager';
import { TerminalInstance } from './TerminalInstance';
import { TerminalListSidebar } from './TerminalListSidebar';
import { NewTerminalButton } from './NewTerminalButton';

const SIDEBAR_STORAGE_KEY = 'marklite.terminal-sidebar-width';
const DEFAULT_SIDEBAR_W = 160;
const MIN_SIDEBAR_W = 80;
const MAX_SIDEBAR_W = 400;

function getSavedSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!raw) return DEFAULT_SIDEBAR_W;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < MIN_SIDEBAR_W || n > MAX_SIDEBAR_W) return DEFAULT_SIDEBAR_W;
    return n;
  } catch {
    return DEFAULT_SIDEBAR_W;
  }
}

interface TerminalPanelProps {
  context: import('../../../plugin-sandbox').PluginContext;
}

/**
 * Multi-terminal panel component (VS Code style).
 * Displays multiple terminal instances with a right sidebar list.
 * Uses a portal to render the + button in the BottomPanelContainer header.
 */
export const TerminalPanel: React.FC<TerminalPanelProps> = ({ context: _context }) => {
  const {
    terminals,
    activeTerminalId,
    defaultShellType,
    createTerminal,
    deleteTerminal,
    renameTerminal,
    setActiveTerminal,
    setDefaultShell,
    updateTerminalRefs,
  } = useTerminalManager();

  // Find the portal target in the BottomPanelContainer header
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    const findTarget = () => {
      const target = document.querySelector('[data-bottom-panel-actions]');
      if (target) {
        setPortalTarget(target);
      } else {
        requestAnimationFrame(findTarget);
      }
    };
    findTarget();
  }, []);

  // Sidebar drag-to-resize state
  const [sidebarWidth, setSidebarWidth] = useState<number>(getSavedSidebarWidth);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      // Dragging left → increase sidebar width
      const delta = dragStartX.current - ev.clientX;
      const next = Math.min(MAX_SIDEBAR_W, Math.max(MIN_SIDEBAR_W, dragStartW.current + delta));
      setSidebarWidth(next);
    };

    const onUp = (ev: MouseEvent) => {
      dragging.current = false;
      const delta = dragStartX.current - ev.clientX;
      const final = Math.min(MAX_SIDEBAR_W, Math.max(MIN_SIDEBAR_W, dragStartW.current + delta));
      setSidebarWidth(final);
      try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(final)); } catch { /* ignore */ }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [sidebarWidth]);

  return (
    <>
      {portalTarget && createPortal(
        <NewTerminalButton
          onCreateTerminal={createTerminal}
          defaultShellType={defaultShellType}
          onSetDefault={setDefaultShell}
        />,
        portalTarget,
      )}

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: 'var(--bg-secondary, #1e1e2e)',
          overflow: 'hidden',
        }}
      >
        {/* Terminal display area */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-secondary, #1e1e2e)',
          }}
        >
          {terminals.map((terminal) => (
            <TerminalInstance
              key={terminal.id}
              instance={terminal}
              isActive={terminal.id === activeTerminalId}
              onUpdateRefs={updateTerminalRefs}
            />
          ))}
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          style={{
            width: 6,
            cursor: 'col-resize',
            flexShrink: 0,
            zIndex: 10,
          }}
        />

        {/* Right sidebar - terminal list */}
        <TerminalListSidebar
          terminals={terminals}
          activeTerminalId={activeTerminalId}
          onSelectTerminal={setActiveTerminal}
          onDeleteTerminal={deleteTerminal}
          onRenameTerminal={renameTerminal}
          width={sidebarWidth}
        />
      </div>
    </>
  );
};
