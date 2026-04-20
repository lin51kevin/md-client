/**
 * Preferences Store — Zustand with persist middleware
 *
 * Centralizes all user preferences that were previously scattered across
 * individual useLocalStorage* calls in usePreferences hook.
 *
 * Persisted to localStorage under key 'marklite-preferences-store'.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyTheme, saveTheme, type ThemeName } from '../lib/theme';
import { getCustomCss, applyCustomCss } from '../lib/ui';

export interface PreferencesState {
  spellCheck: boolean;
  setSpellCheck: (v: boolean) => void;

  vimMode: boolean;
  setVimMode: (v: boolean) => void;

  autoSave: boolean;
  setAutoSave: (v: boolean) => void;

  autoSaveDelay: number;
  setAutoSaveDelay: (v: number) => void;

  gitMdOnly: boolean;
  setGitMdOnly: (v: boolean) => void;

  milkdownPreview: boolean;
  setMilkdownPreview: (v: boolean) => void;

  mermaidTheme: string; // 'default' | 'forest' | 'dark' | 'neutral'
  setMermaidTheme: (v: string) => void;

  fileWatch: boolean;
  setFileWatch: (v: boolean) => void;

  fileWatchBehavior: boolean;
  setFileWatchBehavior: (v: boolean) => void;

  autoUpdateCheck: boolean;
  setAutoUpdateCheck: (v: boolean) => void;

  updateCheckFrequency: 'startup' | '24h';
  setUpdateCheckFrequency: (v: 'startup' | '24h') => void;

  contextMenuIntegration: boolean;
  setContextMenuIntegration: (v: boolean) => void;

  theme: ThemeName;
  setTheme: (v: ThemeName) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      spellCheck: true,
      setSpellCheck: (v) => set({ spellCheck: v }),

      vimMode: false,
      setVimMode: (v) => set({ vimMode: v }),

      autoSave: false,
      setAutoSave: (v) => set({ autoSave: v }),

      autoSaveDelay: 1000,
      setAutoSaveDelay: (v) => set({ autoSaveDelay: v }),

      gitMdOnly: false,
      setGitMdOnly: (v) => set({ gitMdOnly: v }),

      milkdownPreview: true,
      setMilkdownPreview: (v) => set({ milkdownPreview: v }),

      mermaidTheme: 'default',
      setMermaidTheme: (v) => set({ mermaidTheme: v }),

      fileWatch: true,
      setFileWatch: (v) => set({ fileWatch: v }),

      fileWatchBehavior: false,
      setFileWatchBehavior: (v) => set({ fileWatchBehavior: v }),

      autoUpdateCheck: true,
      setAutoUpdateCheck: (v) => set({ autoUpdateCheck: v }),

      updateCheckFrequency: '24h' as const,
      setUpdateCheckFrequency: (v) => set({ updateCheckFrequency: v }),

      contextMenuIntegration: false,
      setContextMenuIntegration: (v) => set({ contextMenuIntegration: v }),

      theme: 'light' as ThemeName,
      setTheme: (v) => {
        set({ theme: v });
        applyTheme(v);
        saveTheme(v);
      },
    }),
    {
      name: 'marklite-preferences-store',
      // Hydrate theme CSS on first load
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          const css = getCustomCss();
          if (css) applyCustomCss(css);
        }
      },
    }
  )
);
