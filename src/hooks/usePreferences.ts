/**
 * usePreferences — compatibility wrapper around preferences-store.
 *
 * Provides the same return signature as the original hook so that
 * existing consumers don't need any changes.
 *
 * Theme side-effects (applyTheme, saveTheme, custom CSS) are handled
 * inside the store's onRehydrateStorage callback and setTheme action.
 */

import { usePreferencesStore } from '../stores';

export function usePreferences() {
  const {
    spellCheck, setSpellCheck,
    vimMode, setVimMode,
    autoSave, setAutoSave,
    autoSaveDelay, setAutoSaveDelay,
    gitMdOnly, setGitMdOnly,
    milkdownPreview, setMilkdownPreview,
    fileWatch, setFileWatch,
    fileWatchBehavior, setFileWatchBehavior,
    autoUpdateCheck, setAutoUpdateCheck,
    updateCheckFrequency, setUpdateCheckFrequency,
    theme, setTheme,
  } = usePreferencesStore();

  // Alias to match original API name
  const setThemeState = setTheme;

  return {
    spellCheck, setSpellCheck,
    vimMode, setVimMode,
    autoSave, setAutoSave,
    autoSaveDelay, setAutoSaveDelay,
    gitMdOnly, setGitMdOnly,
    autoUpdateCheck, setAutoUpdateCheck,
    updateCheckFrequency, setUpdateCheckFrequency,
    milkdownPreview, setMilkdownPreview,
    fileWatch, setFileWatch,
    fileWatchBehavior, setFileWatchBehavior,
    theme, setThemeState,
  };
}
