import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreferencesStore } from '../../stores';

vi.mock('../../lib/theme', () => ({
  applyTheme: vi.fn(),
  getSavedTheme: vi.fn(() => 'light'),
  saveTheme: vi.fn(),
}));
vi.mock('../../lib/custom-css', () => ({
  getCustomCss: vi.fn(() => ''),
  applyCustomCss: vi.fn(),
}));

const { useAppPreferences } = await import('../../hooks/useAppPreferences');

describe('useAppPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    usePreferencesStore.setState({
      spellCheck: false,
      vimMode: false,
      autoSave: true,
      milkdownPreview: true,
      theme: 'light',
    });
  });

  it('returns all preference fields from usePreferences', () => {
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current).toHaveProperty('spellCheck');
    expect(result.current).toHaveProperty('setSpellCheck');
    expect(result.current).toHaveProperty('vimMode');
    expect(result.current).toHaveProperty('milkdownPreview');
    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('autoSave');
    expect(result.current).toHaveProperty('fileWatch');
  });

  it('returns typewriterOptions and setTypewriterOptions', () => {
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current).toHaveProperty('typewriterOptions');
    expect(result.current).toHaveProperty('setTypewriterOptions');
    expect(result.current.typewriterOptions).toMatchObject({
      dimOthers: false,
      hideUI: false,
      showDuration: false,
    });
  });

  it('setSpellCheck updates spellCheck state', () => {
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.spellCheck).toBe(false);
    act(() => { result.current.setSpellCheck(true); });
    expect(result.current.spellCheck).toBe(true);
  });

  it('setVimMode updates vimMode state', () => {
    const { result } = renderHook(() => useAppPreferences());
    act(() => { result.current.setVimMode(true); });
    expect(result.current.vimMode).toBe(true);
  });

  it('setTypewriterOptions updates typewriterOptions', () => {
    const { result } = renderHook(() => useAppPreferences());
    act(() => { result.current.setTypewriterOptions({ dimOthers: true }); });
    expect(result.current.typewriterOptions.dimOthers).toBe(true);
  });

  it('typewriterOptions are persisted to localStorage', () => {
    const { result } = renderHook(() => useAppPreferences());
    act(() => { result.current.setTypewriterOptions({ hideUI: true }); });
    const saved = JSON.parse(localStorage.getItem('marklite-typewriter-options')!);
    expect(saved.hideUI).toBe(true);
  });

  it('loads persisted typewriterOptions from localStorage', () => {
    localStorage.setItem('marklite-typewriter-options', JSON.stringify({
      dimOthers: true, hideUI: false, showDuration: true,
    }));
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.typewriterOptions.dimOthers).toBe(true);
    expect(result.current.typewriterOptions.showDuration).toBe(true);
  });
});
