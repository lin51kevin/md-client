import React, { useRef } from 'react';
import { ViewMode } from '../types';

export function useScrollSync(viewMode: ViewMode) {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  // Timer refs to avoid accumulating pending timeouts on rapid scroll events
  const timerLeftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRightRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'split' || !editorRef.current || !previewRef.current) return;
    if (isScrollingRef.current.right) return; // driven by preview, skip
    isScrollingRef.current.left = true;
    const pct = e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
    previewRef.current.scrollTop = pct * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
    // Cancel previous pending reset and schedule a new one (prevents timer accumulation)
    if (timerLeftRef.current !== null) clearTimeout(timerLeftRef.current);
    timerLeftRef.current = setTimeout(() => {
      isScrollingRef.current.left = false;
      timerLeftRef.current = null;
    }, 50);
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'split' || !editorRef.current || !previewRef.current) return;
    if (isScrollingRef.current.left) return; // driven by editor, skip
    isScrollingRef.current.right = true;
    const pct = e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
    editorRef.current.scrollTop = pct * (editorRef.current.scrollHeight - editorRef.current.clientHeight);
    // Cancel previous pending reset and schedule a new one
    if (timerRightRef.current !== null) clearTimeout(timerRightRef.current);
    timerRightRef.current = setTimeout(() => {
      isScrollingRef.current.right = false;
      timerRightRef.current = null;
    }, 50);
  };

  return { editorRef, previewRef, handleEditorScroll, handlePreviewScroll };
}
