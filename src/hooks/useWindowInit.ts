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
  // Show and maximize window; window starts hidden (visible:false) to prevent flash.
  // Fallback timer ensures show() fires even if maximize() never settles (Wayland).
  useLayoutEffect(() => {
    if (!isTauri) return;
    const win = getCurrentWindow();
    let shown = false;
    const doShow = () => {
      if (shown) return;
      shown = true;
      win.show().catch((err) => console.error('Failed to show window:', err));
    };

    win.maximize()
      .catch((err) => console.error('Failed to maximize window:', err))
      .finally(doShow);

    const t = setTimeout(doShow, 500);
    return () => clearTimeout(t);
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
