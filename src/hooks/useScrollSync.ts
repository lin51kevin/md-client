import React, { useRef } from 'react';
import { ViewMode } from '../types';

export function useScrollSync(viewMode: ViewMode) {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  const handleEditorScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'split' || !editorRef.current || !previewRef.current) return;
    if (isScrollingRef.current.right) return; // driven by preview, skip
    isScrollingRef.current.left = true;
    const pct = e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
    previewRef.current.scrollTop = pct * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
    // Reset after the driven scroll event fires (or after this tick if it doesn't)
    setTimeout(() => { isScrollingRef.current.left = false; }, 50);
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'split' || !editorRef.current || !previewRef.current) return;
    if (isScrollingRef.current.left) return; // driven by editor, skip
    isScrollingRef.current.right = true;
    const pct = e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
    editorRef.current.scrollTop = pct * (editorRef.current.scrollHeight - editorRef.current.clientHeight);
    // Reset after the driven scroll event fires (or after this tick if it doesn't)
    setTimeout(() => { isScrollingRef.current.right = false; }, 50);
  };

  return { editorRef, previewRef, handleEditorScroll, handlePreviewScroll };
}
