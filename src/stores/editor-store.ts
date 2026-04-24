/**
 * Editor Core Store — Zustand
 *
 * Manages: tabs, activeTabId, viewMode, focusMode, splitSizes, isRestoringSession.
 *
 * Note: Tab `doc` fields are intentionally kept in React state (not here) because
 * they are large strings that change frequently and are consumed by CodeMirror.
 * Moving them to zustand would cause unnecessary serialization overhead.
 * This store holds structural/tab metadata state; `useTabs` remains the primary
 * owner of tab content for now.
 */

import { create } from 'zustand';
import type { ViewMode } from '../types';

/** Cursor position kept in store so only StatusBar re-renders on cursor moves. */
export interface CursorPos {
  line: number;
  col: number;
}

/** UI visibility & editor mode state */
interface UIEditorState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  splitSizes: [number, number];
  setSplitSizes: (sizes: [number, number]) => void;

  isRestoringSession: boolean;
  setIsRestoringSession: (v: boolean) => void;

  /** Current cursor position — written by useCursorPosition, read by StatusBar */
  cursor: CursorPos;
  setCursor: (pos: CursorPos) => void;
}

export const useEditorStore = create<UIEditorState>()((set) => ({
  viewMode: 'split' as ViewMode,
  setViewMode: (mode) => {
    set({ viewMode: mode });
    try { localStorage.setItem('marklite-view-mode', mode); } catch { /* ignore */ }
  },

  splitSizes: [50, 50] as [number, number],
  setSplitSizes: (sizes) => set({ splitSizes: sizes }),

  isRestoringSession: true,
  setIsRestoringSession: (v) => set({ isRestoringSession: v }),

  cursor: { line: 1, col: 1 },
  setCursor: (pos) => set({ cursor: pos }),
}));
