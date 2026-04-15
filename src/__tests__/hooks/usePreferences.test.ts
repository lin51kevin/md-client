import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies used by usePreferences that touch DOM/theme
vi.mock('../../lib/theme', () => ({
  applyTheme: vi.fn(),
  getSavedTheme: vi.fn(() => 'light'),
  saveTheme: vi.fn(),
}));
vi.mock('../../lib/custom-css', () => ({
  getCustomCss: vi.fn(() => ''),
  applyCustomCss: vi.fn(),
}));

const { usePreferences } = await import('../../hooks/usePreferences');

describe('usePreferences — milkdownPreview', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to true when no saved value', () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.milkdownPreview).toBe(true);
  });

  it('reads persisted false from localStorage', () => {
    localStorage.setItem('marklite-milkdown-preview', 'false');
    const { result } = renderHook(() => usePreferences());
    expect(result.current.milkdownPreview).toBe(false);
  });

  it('reads persisted true from localStorage', () => {
    localStorage.setItem('marklite-milkdown-preview', 'true');
    const { result } = renderHook(() => usePreferences());
    expect(result.current.milkdownPreview).toBe(true);
  });

  it('setMilkdownPreview updates state and persists', () => {
    const { result } = renderHook(() => usePreferences());
    act(() => {
      result.current.setMilkdownPreview(false);
    });
    expect(result.current.milkdownPreview).toBe(false);
    expect(localStorage.getItem('marklite-milkdown-preview')).toBe('false');
  });

  it('setMilkdownPreview toggles back to true', () => {
    localStorage.setItem('marklite-milkdown-preview', 'false');
    const { result } = renderHook(() => usePreferences());
    act(() => {
      result.current.setMilkdownPreview(true);
    });
    expect(result.current.milkdownPreview).toBe(true);
    expect(localStorage.getItem('marklite-milkdown-preview')).toBe('true');
  });

  it('milkdownPreview is independent of spellCheck', () => {
    const { result } = renderHook(() => usePreferences());
    act(() => {
      result.current.setMilkdownPreview(false);
    });
    // spellCheck default is true and should be unaffected
    expect(result.current.spellCheck).toBe(true);
    expect(result.current.milkdownPreview).toBe(false);
  });
});
