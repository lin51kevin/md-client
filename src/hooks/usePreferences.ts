import { useState, useLayoutEffect, useEffect } from 'react';
import { useLocalStorageBool, useLocalStorageNumber } from './useLocalStorage';
import { applyTheme, getSavedTheme, saveTheme, type ThemeName } from '../lib/theme';
import { getCustomCss, applyCustomCss } from '../lib/custom-css';

export function usePreferences() {
  const [spellCheck, setSpellCheck] = useLocalStorageBool('marklite-spellcheck', true);
  const [vimMode, setVimMode] = useLocalStorageBool('marklite-vimmode', false);
  const [autoSave, setAutoSave] = useLocalStorageBool('marklite-autosave', false);
  const [autoSaveDelay, setAutoSaveDelay] = useLocalStorageNumber('marklite-autosave-delay', 1000);
  const [autoUpdateCheck, setAutoUpdateCheck] = useLocalStorageBool('marklite-auto-update-check', true);
  const [updateCheckFrequency, setUpdateCheckFrequency] = useState<'startup' | '24h'>(() => {
    const saved = localStorage.getItem('marklite-update-check-frequency');
    return (saved === 'startup' || saved === '24h') ? saved : '24h';
  });
  const setUpdateCheckFrequencyPersisted = (freq: 'startup' | '24h') => {
    setUpdateCheckFrequency(freq);
    localStorage.setItem('marklite-update-check-frequency', freq);
  };
  const [gitMdOnly, setGitMdOnly] = useLocalStorageBool('marklite-git-md-only', false);
  const [milkdownPreview, setMilkdownPreview] = useLocalStorageBool('marklite-milkdown-preview', true);
  const [fileWatch, setFileWatch] = useLocalStorageBool('marklite-file-watch', true);
  const [fileWatchBehavior, setFileWatchBehavior] = useLocalStorageBool('marklite-file-watch-behavior', false);
  const [theme, setThemeState] = useState<ThemeName>(() => getSavedTheme() || 'light');

  // F011 - Theme: apply CSS vars synchronously before paint
  useLayoutEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // Apply saved custom CSS on mount
  useEffect(() => {
    const css = getCustomCss();
    if (css) applyCustomCss(css);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    spellCheck, setSpellCheck,
    vimMode, setVimMode,
    autoSave, setAutoSave,
    autoSaveDelay, setAutoSaveDelay,
    gitMdOnly, setGitMdOnly,
    autoUpdateCheck, setAutoUpdateCheck,
    updateCheckFrequency, setUpdateCheckFrequency: setUpdateCheckFrequencyPersisted,
    milkdownPreview, setMilkdownPreview,
    fileWatch, setFileWatch,
    fileWatchBehavior, setFileWatchBehavior,
    theme, setThemeState,
  };
}
