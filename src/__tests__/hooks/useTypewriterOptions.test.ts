import { describe, it, expect, beforeEach } from 'vitest';
import { useTypewriterOptions, type TypewriterOptions } from '../../hooks/useTypewriterOptions';
import { renderHook, act } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
});

describe('useTypewriterOptions', () => {
  it('should have default options', () => {
    const { result } = renderHook(() => useTypewriterOptions());
    expect(result.current[0]).toEqual({
      dimOthers: false,
      hideUI: false,
      showDuration: false,
    });
  });

  it('should update and persist options', () => {
    const { result } = renderHook(() => useTypewriterOptions());
    act(() => {
      result.current[1]({ dimOthers: true });
    });
    expect(result.current[0].dimOthers).toBe(true);

    // Verify persistence
    const saved = JSON.parse(localStorage.getItem('marklite-typewriter-options')!);
    expect(saved.dimOthers).toBe(true);
  });

  it('should load persisted options', () => {
    localStorage.setItem('marklite-typewriter-options', JSON.stringify({
      dimOthers: true,
      hideUI: false,
      showDuration: true,
    }));
    const { result } = renderHook(() => useTypewriterOptions());
    expect(result.current[0].dimOthers).toBe(true);
    expect(result.current[0].showDuration).toBe(true);
  });

  it('should handle multiple updates', () => {
    const { result } = renderHook(() => useTypewriterOptions());
    act(() => result.current[1]({ dimOthers: true }));
    act(() => result.current[1]({ showDuration: true }));
    expect(result.current[0]).toEqual({
      dimOthers: true,
      hideUI: false,
      showDuration: true,
    });
  });
});
