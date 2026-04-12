/**
 * useWindowInit — Tauri window initialization
 *
 * Handles maximize → show sequence and native titlebar theme.
 * Extracted from App.tsx to reduce main component size.
 */
import { useLayoutEffect, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { THEMES, type ThemeName } from '../lib/theme';

export function useWindowInit(isTauri: boolean, theme: ThemeName) {
  // Window initialization: show and maximize once on mount
  useLayoutEffect(() => {
    if (isTauri) {
      const win = getCurrentWindow();
      win.maximize()
        .catch((err) => console.error('Failed to maximize window:', err))
        .finally(() => {
          win.show().catch((err) => console.error('Failed to show window:', err));
        });
    }
  }, [isTauri]);

  // Set native titlebar theme
  useEffect(() => {
    if (isTauri) {
      const nativeTheme = THEMES[theme].isDark ? 'dark' as const : 'light' as const;
      getCurrentWindow().setTheme(nativeTheme).catch((err) => {
        console.error('Failed to set window theme:', err);
      });
    }
  }, [theme, isTauri]);
}
