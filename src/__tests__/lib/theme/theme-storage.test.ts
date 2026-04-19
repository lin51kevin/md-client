import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredThemes,
  storeTheme,
  removeStoredTheme,
  THEME_STORAGE_KEY,
} from '../../../lib/theme/storage';
import type { ExternalThemeConfig } from '../../../lib/theme/manager';

// Isolate isBuiltInTheme so tests are not coupled to the real built-in list
vi.mock('../../lib/theme/manager', () => ({
  isBuiltInTheme: (name: string) => ['light', 'dark', 'sepia', 'high-contrast'].includes(name),
}));

function makeTheme(name: string): ExternalThemeConfig {
  return {
    name,
    label: name,
    cssVars: {},
    cmTheme: 'light',
    previewClass: '',
    cssText: '',
  } as unknown as ExternalThemeConfig;
}

describe('getStoredThemes', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when nothing stored', () => {
    expect(getStoredThemes()).toEqual([]);
  });

  it('returns themes from a valid store', () => {
    const store = { version: 1, themes: [makeTheme('ocean')] };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(store));
    expect(getStoredThemes()).toEqual([makeTheme('ocean')]);
  });

  it('returns empty array on invalid JSON', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'bad json{{');
    expect(getStoredThemes()).toEqual([]);
  });

  it('returns empty array when store lacks themes key', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: 1 }));
    expect(getStoredThemes()).toEqual([]);
  });

  it('returns empty array when themes is not an array', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: 1, themes: 'bad' }));
    expect(getStoredThemes()).toEqual([]);
  });
});

describe('storeTheme', () => {
  beforeEach(() => localStorage.clear());

  it('adds a new custom theme', () => {
    storeTheme(makeTheme('ocean'));
    expect(getStoredThemes()).toEqual([makeTheme('ocean')]);
  });

  it('updates an existing theme instead of duplicating', () => {
    storeTheme(makeTheme('ocean'));
    const updated = { ...makeTheme('ocean'), label: 'Ocean Updated' };
    storeTheme(updated);
    const stored = getStoredThemes();
    expect(stored.length).toBe(1);
    expect(stored[0].label).toBe('Ocean Updated');
  });

  it('can add multiple distinct themes', () => {
    storeTheme(makeTheme('ocean'));
    storeTheme(makeTheme('forest'));
    expect(getStoredThemes().length).toBe(2);
  });

  it('silently ignores built-in theme names', () => {
    storeTheme(makeTheme('light'));
    storeTheme(makeTheme('dark'));
    expect(getStoredThemes()).toEqual([]);
  });

  it('silently ignores all four built-in names', () => {
    for (const name of ['light', 'dark', 'sepia', 'high-contrast']) {
      storeTheme(makeTheme(name));
    }
    expect(getStoredThemes()).toEqual([]);
  });
});

describe('removeStoredTheme', () => {
  beforeEach(() => localStorage.clear());

  it('removes a stored theme by name', () => {
    storeTheme(makeTheme('ocean'));
    removeStoredTheme('ocean');
    expect(getStoredThemes()).toEqual([]);
  });

  it('leaves other themes intact', () => {
    storeTheme(makeTheme('ocean'));
    storeTheme(makeTheme('forest'));
    removeStoredTheme('ocean');
    expect(getStoredThemes()).toEqual([makeTheme('forest')]);
  });

  it('is a no-op when theme not found', () => {
    storeTheme(makeTheme('ocean'));
    removeStoredTheme('nonexistent');
    expect(getStoredThemes().length).toBe(1);
  });

  it('silently ignores built-in theme names', () => {
    // Simulate someone directly populating the store with a built-in name
    // removeStoredTheme should refuse to act
    const store = { version: 1, themes: [makeTheme('light')] };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(store));
    removeStoredTheme('light');
    // Should not have removed it (built-in guard fires first)
    const after = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!);
    expect(after.themes.length).toBe(1);
  });
});
