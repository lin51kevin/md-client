import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  type ThemePreference,
  getThemePreference,
  setThemePreference,
  resolveEffectiveTheme,
} from './theme-auto';

describe('theme-auto: getThemePreference / setThemePreference', () => {
  beforeEach(() => {
    localStorage.removeItem('md-client-theme-preference');
  });

  afterEach(() => {
    localStorage.removeItem('md-client-theme-preference');
  });

  it('defaults to system preference', () => {
    const pref = getThemePreference();
    expect(pref).toBe('system');
  });

  it('persists and retrieves explicit light preference', () => {
    setThemePreference('light');
    expect(getThemePreference()).toBe('light');
  });

  it('persists and retrieves explicit dark preference', () => {
    setThemePreference('dark');
    expect(getThemePreference()).toBe('dark');
  });

  it('overwrites previous preference', () => {
    setThemePreference('light');
    setThemePreference('dark');
    expect(getThemePreference()).toBe('dark');
  });
});

describe('theme-auto: resolveEffectiveTheme', () => {
  it('returns explicit light when preference is light', () => {
    const result = resolveEffectiveTheme('light', 'dark');
    expect(result).toBe('light');
  });

  it('returns explicit dark when preference is dark', () => {
    const result = resolveEffectiveTheme('dark', 'light');
    expect(result).toBe('dark');
  });

  it('returns system dark when preference is system and system is dark', () => {
    const result = resolveEffectiveTheme('system', 'dark');
    expect(result).toBe('dark');
  });

  it('returns system light when preference is system and system is light', () => {
    const result = resolveEffectiveTheme('system', 'light');
    expect(result).toBe('light');
  });
});
