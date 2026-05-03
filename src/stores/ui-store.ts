/**
 * UI Store — Zustand
 *
 * Manages transient UI state: modal visibility, context menus, drag state,
 * sidebar active panel, and notification banners.
 *
 * Most of this state is ephemeral (not persisted), except activePanel
 * which is synced to localStorage manually (matching original behavior).
 */

import { create } from 'zustand';
import type { PanelId } from '../components/editor/ActivityBar';

/** Context menu position payload */
export interface CtxMenuState {
  x: number;
  y: number;
}

/** Editor context menu includes editor context info */
export interface EditorCtxMenuState extends CtxMenuState {
  context: import('../lib/editor').ContextInfo;
}

/** Drag kind for overlay display */
export type DragKind = 'file' | 'image' | 'folder';

interface UIState {
  // ── Modal visibility ──────────────────────────────────────────────
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;

  showAbout: boolean;
  setShowAbout: (v: boolean) => void;

  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;

  showQuickOpen: boolean;
  setShowQuickOpen: (v: boolean) => void;

  showAIPanel: boolean;
  setShowAIPanel: (v: boolean) => void;

  showUpdateNotification: boolean;
  setShowUpdateNotification: (v: boolean) => void;

  // ── Sidebar panel ─────────────────────────────────────────────────
  activePanel: PanelId | null;
  setActivePanel: (panel: PanelId | null) => void;
  togglePanel: (panel: PanelId) => void;

  // ── Bottom panel (independent from sidebar) ───────────────────────
  activeBottomPanel: string | null;
  setActiveBottomPanel: (panel: string | null) => void;
  toggleBottomPanel: (panel: string) => void;

  // ── Context menus ─────────────────────────────────────────────────
  ctxMenu: ({ x: number; y: number; tabId: string } & CtxMenuState) | null;
  setCtxMenu: (v: UIState['ctxMenu']) => void;

  editorCtxMenu: EditorCtxMenuState | null;
  setEditorCtxMenu: (v: EditorCtxMenuState | null) => void;

  previewCtxMenu: CtxMenuState | null;
  setPreviewCtxMenu: (v: CtxMenuState | null) => void;

  // ── Drag & Drop ───────────────────────────────────────────────────
  isDragOver: boolean;
  setIsDragOver: (v: boolean) => void;

  dragKind: DragKind;
  setDragKind: (v: DragKind) => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  // Modals
  showSettings: false,
  setShowSettings: (v) => set({ showSettings: v }),

  showAbout: false,
  setShowAbout: (v) => set({ showAbout: v }),

  showCommandPalette: false,
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),

  showQuickOpen: false,
  setShowQuickOpen: (v) => set({ showQuickOpen: v }),

  showAIPanel: (() => {
    try { return localStorage.getItem('marklite-ai-panel') === 'true'; } catch { return false; }
  })(),
  setShowAIPanel: (v) => {
    set({ showAIPanel: v });
    try { localStorage.setItem('marklite-ai-panel', String(v)); } catch { /* ignore */ }
  },

  showUpdateNotification: false,
  setShowUpdateNotification: (v) => set({ showUpdateNotification: v }),

  // Sidebar panel — persisted to localStorage manually
  activePanel: (() => {
    try { return (localStorage.getItem('marklite-active-panel') || '') || null; } catch { return null; }
  })(),
  setActivePanel: (panel) => {
    set({ activePanel: panel });
    try { localStorage.setItem('marklite-active-panel', panel ?? ''); } catch { /* ignore */ }
  },
  togglePanel: (panel) => {
    const current = get().activePanel;
    const next = current === panel ? null : panel;
    set({ activePanel: next });
    try { localStorage.setItem('marklite-active-panel', next ?? ''); } catch { /* ignore */ }
  },

  // Bottom panel — persisted independently
  activeBottomPanel: (() => {
    try { return localStorage.getItem('marklite-active-bottom-panel') || null; } catch { return null; }
  })(),
  setActiveBottomPanel: (panel) => {
    set({ activeBottomPanel: panel });
    try { localStorage.setItem('marklite-active-bottom-panel', panel ?? ''); } catch { /* ignore */ }
  },
  toggleBottomPanel: (panel) => {
    const current = get().activeBottomPanel;
    const next = current === panel ? null : panel;
    set({ activeBottomPanel: next });
    try { localStorage.setItem('marklite-active-bottom-panel', next ?? ''); } catch { /* ignore */ }
  },

  // Context menus
  ctxMenu: null,
  setCtxMenu: (v) => set({ ctxMenu: v }),

  editorCtxMenu: null,
  setEditorCtxMenu: (v) => set({ editorCtxMenu: v }),

  previewCtxMenu: null,
  setPreviewCtxMenu: (v) => set({ previewCtxMenu: v }),

  // Drag & Drop
  isDragOver: false,
  setIsDragOver: (v) => set({ isDragOver: v }),

  dragKind: 'file' as DragKind,
  setDragKind: (v) => set({ dragKind: v }),
}));
