import { useState, useLayoutEffect, useEffect } from 'react';
import { useLocalStorageBool, useLocalStorageNumber } from './useLocalStorage';
import { applyTheme, getSavedTheme, saveTheme, type ThemeName } from '../lib/theme';
import { getCustomCss, applyCustomCss } from '../lib/ui';
import { StorageKeys } from '../lib/storage';

export function usePreferences() {
  const [spellCheck, setSpellCheck] = useLocalStorageBool(StorageKeys.SPELLCHECK, true);
  const [vimMode, setVimMode] = useLocalStorageBool(StorageKeys.VIM_MODE, false);
  const [autoSave, setAutoSave] = useLocalStorageBool(StorageKeys.AUTO_SAVE, false);
  const [autoSaveDelay, setAutoSaveDelay] = useLocalStorageNumber(StorageKeys.AUTO_SAVE_DELAY, 1000);
  const [autoUpdateCheck, setAutoUpdateCheck] = useLocalStorageBool(StorageKeys.AUTO_UPDATE_CHECK, true);
  const [updateCheckFrequency, setUpdateCheckFrequency] = useState<'startup' | '24h'>(() => {
    const saved = localStorage.getItem(StorageKeys.UPDATE_CHECK_FREQUENCY);
    return (saved === 'startup' || saved === '24h') ? saved : '24h';
  });
  const setUpdateCheckFrequencyPersisted = (freq: 'startup' | '24h') => {
    setUpdateCheckFrequency(freq);
    localStorage.setItem(StorageKeys.UPDATE_CHECK_FREQUENCY, freq);
  };
  const [gitMdOnly, setGitMdOnly] = useLocalStorageBool(StorageKeys.GIT_MD_ONLY, false);
  const [milkdownPreview, setMilkdownPreview] = useLocalStorageBool(StorageKeys.MILKDOWN_PREVIEW, true);
  const [fileWatch, setFileWatch] = useLocalStorageBool(StorageKeys.FILE_WATCH, true);
  const [fileWatchBehavior, setFileWatchBehavior] = useLocalStorageBool(StorageKeys.FILE_WATCH_BEHAVIOR, false);
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
