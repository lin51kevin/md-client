/**
 * useScrollPreserve — utility for saving and restoring scroll position
 * across file hot-reloads.
 *
 * CodeMirror: saves the top visible line number (accurate with folding/wrapping).
 * Preview/Milkdown: saves scroll percentage (no reliable line mapping in rendered HTML).
 */
import type { RefObject } from 'react';
import { EditorView } from '@codemirror/view';
import type { ViewMode } from '../types';

export interface ScrollRefsSnapshot {
  editorRef: RefObject<HTMLDivElement | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  cmViewRef: RefObject<EditorView | null>;
  viewMode: ViewMode;
}

export interface SavedScrollPosition {
  /** Top visible line number in CodeMirror (1-based) */
  editorLine: number | null;
  /** Preview scroll percentage (0–1) */
  previewPct: number | null;
  viewMode: ViewMode;
}

/**
 * Capture current scroll positions from the editor and preview panes.
 */
export function saveScrollPosition(refs: ScrollRefsSnapshot): SavedScrollPosition {
  const { previewRef, cmViewRef, viewMode } = refs;
  let editorLine: number | null = null;
  let previewPct: number | null = null;

  // Save CodeMirror scroll position (edit or split mode)
  if ((viewMode === 'edit' || viewMode === 'split') && cmViewRef.current) {
    const view = cmViewRef.current;
    try {
      const scrollTop = view.scrollDOM.scrollTop;
      const block = view.lineBlockAtHeight(scrollTop + view.documentTop);
      const line = view.state.doc.lineAt(block.from);
      editorLine = line.number;
    } catch {
      // Fallback: use raw scrollTop percentage
      const dom = view.scrollDOM;
      const max = dom.scrollHeight - dom.clientHeight;
      editorLine = max > 0 ? Math.round((dom.scrollTop / max) * view.state.doc.lines) : null;
    }
  }

  // Save preview scroll position (split or preview mode)
  if ((viewMode === 'split' || viewMode === 'preview') && previewRef.current) {
    const el = previewRef.current;
    const max = el.scrollHeight - el.clientHeight;
    previewPct = max > 0 ? el.scrollTop / max : 0;
  }

  return { editorLine, previewPct, viewMode };
}

/**
 * Restore scroll positions after content has been re-rendered.
 * Uses double-requestAnimationFrame to ensure React flush + browser paint.
 */
export function restoreScrollPosition(
  saved: SavedScrollPosition,
  refs: ScrollRefsSnapshot,
): void {
  const { previewRef, cmViewRef } = refs;
  const currentViewMode = refs.viewMode;

  const doRestore = () => {
    // Restore CodeMirror scroll (if still in edit/split mode)
    if (saved.editorLine !== null && (currentViewMode === 'edit' || currentViewMode === 'split') && cmViewRef.current) {
      const view = cmViewRef.current;
      const totalLines = view.state.doc.lines;
      // Clamp to valid line range
      const targetLine = Math.min(saved.editorLine, totalLines);
      try {
        const line = view.state.doc.line(targetLine);
        view.dispatch({
          effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 0 }),
        });
      } catch {
        // Fallback: set raw scrollTop by percentage
        const dom = view.scrollDOM;
        const max = dom.scrollHeight - dom.clientHeight;
        if (max > 0 && totalLines > 0) {
          dom.scrollTop = (targetLine / totalLines) * max;
        }
      }
    }

    // Restore preview scroll (if still in split/preview mode)
    if (saved.previewPct !== null && (currentViewMode === 'split' || currentViewMode === 'preview') && previewRef.current) {
      const el = previewRef.current;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) {
        el.scrollTop = saved.previewPct * max;
      }
    }
  };

  // Double-rAF ensures React has flushed state + browser has painted
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      doRestore();
    });
  });

  // Timeout fallback in case rAF doesn't fire (e.g., tab not visible)
  setTimeout(doRestore, 150);
}

/** Type for the lazy provider callback used by useFileWatchState */
export type ScrollRefsProvider = () => ScrollRefsSnapshot | null;
