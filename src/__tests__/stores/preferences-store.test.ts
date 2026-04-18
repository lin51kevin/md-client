/**
 * preferences-store tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePreferencesStore } from '../../stores/preferences-store';

beforeEach(() => {
  usePreferencesStore.setState({
    spellCheck: true,
    vimMode: false,
    autoSave: false,
    autoSaveDelay: 1000,
    gitMdOnly: false,
    milkdownPreview: true,
    fileWatch: true,
    fileWatchBehavior: false,
    autoUpdateCheck: true,
    updateCheckFrequency: '24h',
    theme: 'light',
  });
});

describe('usePreferencesStore', () => {
  it('has correct default values', () => {
    const state = usePreferencesStore.getState();
    expect(state.spellCheck).toBe(true);
    expect(state.vimMode).toBe(false);
    expect(state.autoSave).toBe(false);
    expect(state.autoSaveDelay).toBe(1000);
    expect(state.theme).toBe('light');
  });

  it('toggles spellCheck', () => {
    usePreferencesStore.getState().setSpellCheck(false);
    expect(usePreferencesStore.getState().spellCheck).toBe(false);
    usePreferencesStore.getState().setSpellCheck(true);
    expect(usePreferencesStore.getState().spellCheck).toBe(true);
  });

  it('toggles vimMode', () => {
    usePreferencesStore.getState().setVimMode(true);
    expect(usePreferencesStore.getState().vimMode).toBe(true);
  });

  it('sets autoSaveDelay', () => {
    usePreferencesStore.getState().setAutoSaveDelay(3000);
    expect(usePreferencesStore.getState().autoSaveDelay).toBe(3000);
  });

  it('sets theme', () => {
    usePreferencesStore.getState().setTheme('dark');
    expect(usePreferencesStore.getState().theme).toBe('dark');
  });

  it('sets updateCheckFrequency', () => {
    usePreferencesStore.getState().setUpdateCheckFrequency('startup');
    expect(usePreferencesStore.getState().updateCheckFrequency).toBe('startup');
  });

  it('sets fileWatch and fileWatchBehavior', () => {
    usePreferencesStore.getState().setFileWatch(false);
    expect(usePreferencesStore.getState().fileWatch).toBe(false);
    usePreferencesStore.getState().setFileWatchBehavior(true);
    expect(usePreferencesStore.getState().fileWatchBehavior).toBe(true);
  });
});
