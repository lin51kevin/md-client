/**
 * useAppUIState — aggregates UI overlay / modal state for AppShell.
 *
 * Consolidates:
 *   - Modal visibility flags (settings, about, AI panel) from UIStore
 *   - Drag overlay state from UIStore
 *   - Tab context menu state from UIStore
 *   - Focus / chromeless mode (useFocusMode)
 *   - Welcome screen state (useWelcome)
 *   - Focus-start timestamp ref for typewriter duration display
 */
import { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '../stores';
import { useFocusMode } from './useFocusMode';
import { useWelcome } from './useWelcome';

export function useAppUIState() {
  // ── Modal visibility ─────────────────────────────────────────────
  const showSettings = useUIStore((s) => s.showSettings);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const openSettings = useCallback(() => setShowSettings(true), [setShowSettings]);

  const showAbout = useUIStore((s) => s.showAbout);
  const setShowAbout = useUIStore((s) => s.setShowAbout);

  const showAIPanel = useUIStore((s) => s.showAIPanel);
  const setShowAIPanel = useUIStore((s) => s.setShowAIPanel);

  // ── Drag overlay ─────────────────────────────────────────────────
  const isDragOver = useUIStore((s) => s.isDragOver);
  const setIsDragOver = useUIStore((s) => s.setIsDragOver);
  const dragKind = useUIStore((s) => s.dragKind);
  const setDragKind = useUIStore((s) => s.setDragKind);

  // ── Tab context menu ─────────────────────────────────────────────
  const ctxMenu = useUIStore((s) => s.ctxMenu);
  const setCtxMenu = useUIStore((s) => s.setCtxMenu);
  const setPreviewCtxMenu = useUIStore((s) => s.setPreviewCtxMenu);

  // ── Focus / chromeless mode ──────────────────────────────────────
  const { focusMode, setFocusMode, isChromeless, hideStatusBar } = useFocusMode();

  // ── Welcome screen ───────────────────────────────────────────────
  const { welcomeDismissed, handleDismissWelcome, handleShowWelcome } = useWelcome();

  // ── Focus-start ref (typewriter duration display) ────────────────
  const focusStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (focusMode === 'typewriter') {
      if (!focusStartRef.current) focusStartRef.current = Date.now();
    } else {
      focusStartRef.current = null;
    }
  }, [focusMode]);

  return {
    showSettings, setShowSettings, openSettings,
    showAbout, setShowAbout,
    showAIPanel, setShowAIPanel,
    isDragOver, setIsDragOver,
    dragKind, setDragKind,
    ctxMenu, setCtxMenu, setPreviewCtxMenu,
    focusMode, setFocusMode, isChromeless, hideStatusBar,
    welcomeDismissed, handleDismissWelcome, handleShowWelcome,
    focusStartRef,
  };
}
