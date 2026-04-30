import { useCallback, useEffect, useRef } from 'react';
import { usePreferencesStore } from '../stores';

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

/** Presets shown in the StatusBar zoom picker */
export const ZOOM_PRESETS = [50, 75, 80, 100, 110, 125, 150, 200] as const;

function clampZoom(v: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));
}

/**
 * useZoom — provides zoom state and handlers for the editor/preview area.
 *
 * Reads from and writes to the persisted preferences store.
 * Attaches a Ctrl+wheel listener to the given container ref.
 */
export function useZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const zoomLevel = usePreferencesStore((s) => s.zoomLevel);
  const setZoomLevel = usePreferencesStore((s) => s.setZoomLevel);

  const zoomIn = useCallback(() => {
    const current = usePreferencesStore.getState().zoomLevel;
    setZoomLevel(clampZoom(current + ZOOM_STEP));
  }, [setZoomLevel]);

  const zoomOut = useCallback(() => {
    const current = usePreferencesStore.getState().zoomLevel;
    setZoomLevel(clampZoom(current - ZOOM_STEP));
  }, [setZoomLevel]);

  const resetZoom = useCallback(() => {
    setZoomLevel(100);
  }, [setZoomLevel]);

  const setZoomPreset = useCallback((level: number) => {
    setZoomLevel(clampZoom(level));
  }, [setZoomLevel]);

  // Attach Ctrl+wheel listener to container
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoomLevel(clampZoom(zoomLevelRef.current + delta));
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [containerRef, setZoomLevel]);

  return { zoomLevel, zoomIn, zoomOut, resetZoom, setZoomPreset };
}
