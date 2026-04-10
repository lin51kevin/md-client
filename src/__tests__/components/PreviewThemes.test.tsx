import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../../components/SettingsModal';
import {
  THEMES,
  getSavedTheme,
  saveTheme,
  applyTheme,
} from '../../lib/theme';
import type { ThemeName } from '../../lib/theme';

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Mock document.documentElement.style for applyTheme
const cssVarMap: Record<string, string> = {};
const originalDocument = globalThis.document;
vi.stubGlobal('document', {
  ...globalThis.document,
  documentElement: {
    ...originalDocument.documentElement,
    style: {
      ...originalDocument.documentElement.style,
      setProperty: (name: string, value: string) => { cssVarMap[name] = value; },
      removeProperty: (name: string) => { delete cssVarMap[name]; },
      colorScheme: '',
    },
  },
  body: originalDocument.body, // Preserve body for portal rendering
  createElement: originalDocument.createElement.bind(originalDocument), // Preserve createElement  querySelector: originalDocument.querySelector.bind(originalDocument),
  querySelectorAll: originalDocument.querySelectorAll.bind(originalDocument),
});

describe('Unified Theme System', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete (store as any)[k]);
    Object.keys(cssVarMap).forEach(k => delete cssVarMap[k]);
  });

  it('should have 4 unified themes defined in THEMES', () => {
    const themes = Object.keys(THEMES);
    expect(themes).toContain('light');
    expect(themes).toContain('dark');
    expect(themes).toContain('sepia');
    expect(themes).toContain('high-contrast');
    expect(themes.length).toBe(4);
  });

  it('each theme should have required properties', () => {
    for (const [name, cfg] of Object.entries(THEMES)) {
      expect(cfg).toHaveProperty('label');
      expect(cfg).toHaveProperty('labelEn');
      expect(cfg).toHaveProperty('cmTheme');
      expect(cfg).toHaveProperty('previewClass');
      expect(cfg).toHaveProperty('cssVars');
      expect(cfg).toHaveProperty('isDark');
      expect(typeof cfg.label).toBe('string');
      expect(typeof cfg.previewClass).toBe('string');
      expect(['light', 'dark', 'sepia', 'high-contrast']).toContain(cfg.cmTheme);
    }
  });

  it('getSavedTheme returns null when nothing saved', () => {
    const result = getSavedTheme();
    expect(result).toBeNull();
  });

  it('saveTheme persists to localStorage', () => {
    saveTheme('sepia' as ThemeName);
    expect(store['marklite-theme']).toBe('sepia');
  });

  it('getSavedTheme reads back saved value', () => {
    store['marklite-theme'] = 'high-contrast';
    const result = getSavedTheme();
    expect(result).toBe('high-contrast');
  });

  it('applyTheme sets CSS variables on root element', () => {
    applyTheme('dark');
    expect(cssVarMap['--bg-primary']).toBe('#0d1117');
    expect(cssVarMap['--text-primary']).toBe('#f0f6fc');
  });

  it('applyTheme sets color-scheme for dark theme', () => {
    applyTheme('dark');
    expect((document.documentElement as any).style.colorScheme).toBe('dark');
  });

  it('applyTheme sets color-scheme for light theme', () => {
    applyTheme('light');
    expect((document.documentElement as any).style.colorScheme).toBe('light');
  });

  it('sepia theme has correct previewClass', () => {
    expect(THEMES.sepia.previewClass).toBe('markdown-preview-sepia');
  });

  it('high-contrast theme has correct previewClass', () => {
    expect(THEMES['high-contrast'].previewClass).toBe('markdown-preview-high-contrast');
  });

  it('dark theme has markdown-preview-dark previewClass', () => {
    expect(THEMES.dark.previewClass).toBe('markdown-preview-dark');
  });

  it('light theme has empty previewClass', () => {
    expect(THEMES.light.previewClass).toBe('');
  });

  it('SettingsModal renders unified theme selector with 4 options in appearance tab', () => {
    render(
      <SettingsModal
        visible
        onClose={() => {}}
        currentTheme="light"
        onThemeChange={() => {}}
        spellCheck={false}
        onSpellCheckChange={() => {}}
        vimMode={false}
        onVimModeChange={() => {}}
      />
    );

    // Click appearance tab
    const appearanceTab = screen.getByText(/Appearance|外观/);
    fireEvent.click(appearanceTab);

    // Should show theme select with all 4 options
    const selects = screen.getAllByRole('combobox');
    const themeSelect = selects.find(s =>
      s.querySelector('option[value="light"]') &&
      s.querySelector('option[value="dark"]') &&
      s.querySelector('option[value="sepia"]') &&
      s.querySelector('option[value="high-contrast"]')
    );
    expect(themeSelect).toBeDefined();
  });

  it('SettingsModal does NOT have separate preview theme selector', () => {
    render(
      <SettingsModal
        visible
        onClose={() => {}}
        currentTheme="light"
        onThemeChange={() => {}}
        spellCheck={false}
        onSpellCheckChange={() => {}}
        vimMode={false}
        onVimModeChange={() => {}}
      />
    );

    // Click appearance tab
    const appearanceTab = screen.getByText(/Appearance|外观/);
    fireEvent.click(appearanceTab);

    // Should only have ONE select (unified theme), not two
    const selects = screen.getAllByRole('combobox');
    // Only the theme select, no preview theme select
    expect(selects.length).toBe(1);

    // No "预览主题" or "Preview Theme" label text
    expect(screen.queryByText(/预览主题|Preview Theme/i)).toBeNull();
  });
});
