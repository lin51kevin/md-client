import React, { useCallback, useEffect, useRef } from 'react';
import { ViewMode } from '../types';

const SNAP_THRESHOLD = 5;   // px – ignore micro-scrolls to reduce jitter
const LOCK_DURATION = 80;   // ms – scroll-lock timeout (slightly longer for safety)

type Side = 'editor' | 'preview';

/** Cached scroll dimensions, refreshed only when content changes. */
interface ScrollDims {
  editorMax: number;
  previewMax: number;
}

export function useScrollSync(viewMode: ViewMode, debouncedDoc?: string) {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const timerLeftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRightRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cache scroll dimensions – only updated on content change, not every scroll frame
  const dimsRef = useRef<ScrollDims>({ editorMax: 0, previewMax: 0 });
  const lastSyncRef = useRef<{ editor: number; preview: number }>({ editor: 0, preview: 0 });

  // Refresh cached scroll dimensions when debounced content changes
  useEffect(() => {
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (ed && pv) {
      dimsRef.current = {
        editorMax: ed.scrollHeight - ed.clientHeight,
        previewMax: pv.scrollHeight - pv.clientHeight,
      };
    }
  }, [debouncedDoc]);

  /** Core sync: snap-to-edge detection + percentage fallback using cached dims. */
  const syncScroll = useCallback(
    (source: Side, sourceEl: HTMLDivElement, targetEl: HTMLDivElement) => {
      const sourceMax = sourceEl.scrollHeight - sourceEl.clientHeight;
      const targetMax = targetEl.scrollHeight - targetEl.clientHeight;
      if (sourceMax <= 0 || targetMax <= 0) return;

      const sourceTop = sourceEl.scrollTop;

      // Snap to top
      if (sourceTop <= SNAP_THRESHOLD) {
        targetEl.scrollTop = 0;
        return;
      }
      // Snap to bottom
      if (sourceMax - sourceTop <= SNAP_THRESHOLD) {
        targetEl.scrollTop = targetMax;
        return;
      }

      // Micro-scroll debounce: skip if change is tiny
      const key = source === 'editor' ? 'editor' : 'preview';
      const prevTop = lastSyncRef.current[key];
      if (Math.abs(sourceTop - prevTop) < SNAP_THRESHOLD) return;
      lastSyncRef.current[key] = sourceTop;

      // Percentage sync using *live* dims (they reflect the current rendered size)
      const pct = sourceTop / sourceMax;
      targetEl.scrollTop = pct * targetMax;
    },
    [],
  );

  const triggerEditorScroll = useCallback(() => {
    if (viewMode !== 'split') return;
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (!ed || !pv) return;
    if (isScrollingRef.current.right) return;
    isScrollingRef.current.left = true;
    syncScroll('editor', ed, pv);
    if (timerLeftRef.current !== null) clearTimeout(timerLeftRef.current);
    timerLeftRef.current = setTimeout(() => {
      isScrollingRef.current.left = false;
      lastSyncRef.current.editor = 0; // reset so next user scroll is not throttled
      timerLeftRef.current = null;
    }, LOCK_DURATION);
  }, [viewMode, syncScroll]);

  const handleEditorScroll = (_e: React.UIEvent<HTMLDivElement>) => {
    triggerEditorScroll();
  };

  const handlePreviewScroll = (_e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'split') return;
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (!ed || !pv) return;
    if (isScrollingRef.current.left) return;
    isScrollingRef.current.right = true;
    syncScroll('preview', pv, ed);
    if (timerRightRef.current !== null) clearTimeout(timerRightRef.current);
    timerRightRef.current = setTimeout(() => {
      isScrollingRef.current.right = false;
      lastSyncRef.current.preview = 0;
      timerRightRef.current = null;
    }, LOCK_DURATION);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerLeftRef.current !== null) clearTimeout(timerLeftRef.current);
      if (timerRightRef.current !== null) clearTimeout(timerRightRef.current);
    };
  }, []);

  return { editorRef, previewRef, handleEditorScroll, handlePreviewScroll, triggerEditorScroll };
}
