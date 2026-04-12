import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorageBool, useLocalStorageNumber } from '../../hooks/useLocalStorage';

describe('useLocalStorageBool', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns defaultValue when key is absent', () => {
    const { result } = renderHook(() => useLocalStorageBool('test-key', true));
    expect(result.current[0]).toBe(true);
  });

  it('returns false as defaultValue', () => {
    const { result } = renderHook(() => useLocalStorageBool('test-key', false));
    expect(result.current[0]).toBe(false);
  });

  it('reads persisted value from localStorage on mount', () => {
    localStorage.setItem('test-key', 'false');
    const { result } = renderHook(() => useLocalStorageBool('test-key', true));
    expect(result.current[0]).toBe(false);
  });

  it('reads persisted true from localStorage', () => {
    localStorage.setItem('test-key', 'true');
    const { result } = renderHook(() => useLocalStorageBool('test-key', false));
    expect(result.current[0]).toBe(true);
  });

  it('updates state and persists to localStorage via setter', () => {
    const { result } = renderHook(() => useLocalStorageBool('test-key', false));

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('test-key')).toBe('true');
  });

  it('persists false correctly', () => {
    const { result } = renderHook(() => useLocalStorageBool('test-key', true));

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem('test-key')).toBe('false');
  });

  it('falls back to defaultValue when localStorage throws on read', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useLocalStorageBool('test-key', true));
    expect(result.current[0]).toBe(true);
    spy.mockRestore();
  });

  it('does not throw when localStorage throws on write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useLocalStorageBool('test-key', false));

    expect(() => {
      act(() => {
        result.current[1](true);
      });
    }).not.toThrow();

    // State should still update in-memory even if persistence fails
    expect(result.current[0]).toBe(true);
    spy.mockRestore();
  });

  it('two hooks with different keys are independent', () => {
    const { result: r1 } = renderHook(() => useLocalStorageBool('key-a', false));
    const { result: r2 } = renderHook(() => useLocalStorageBool('key-b', false));

    act(() => {
      r1.current[1](true);
    });

    expect(r1.current[0]).toBe(true);
    expect(r2.current[0]).toBe(false);
    expect(localStorage.getItem('key-a')).toBe('true');
    expect(localStorage.getItem('key-b')).toBeNull();
  });
});

describe('useLocalStorageNumber', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns defaultValue when key is absent', () => {
    const { result } = renderHook(() => useLocalStorageNumber('num-key', 1000));
    expect(result.current[0]).toBe(1000);
  });

  it('reads persisted integer from localStorage', () => {
    localStorage.setItem('num-key', '2000');
    const { result } = renderHook(() => useLocalStorageNumber('num-key', 1000));
    expect(result.current[0]).toBe(2000);
  });

  it('updates state and persists to localStorage via setter', () => {
    const { result } = renderHook(() => useLocalStorageNumber('num-key', 1000));

    act(() => {
      result.current[1](5000);
    });

    expect(result.current[0]).toBe(5000);
    expect(localStorage.getItem('num-key')).toBe('5000');
  });

  it('falls back to defaultValue when stored value is NaN', () => {
    localStorage.setItem('num-key', 'not-a-number');
    const { result } = renderHook(() => useLocalStorageNumber('num-key', 1000));
    expect(result.current[0]).toBe(1000);
  });

  it('falls back to defaultValue when localStorage throws on read', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useLocalStorageNumber('num-key', 3000));
    expect(result.current[0]).toBe(3000);
    spy.mockRestore();
  });

  it('does not throw when localStorage throws on write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useLocalStorageNumber('num-key', 1000));

    expect(() => {
      act(() => {
        result.current[1](2000);
      });
    }).not.toThrow();

    expect(result.current[0]).toBe(2000);
    spy.mockRestore();
  });

  it('two hooks with different keys are independent', () => {
    const { result: r1 } = renderHook(() => useLocalStorageNumber('delay-a', 1000));
    const { result: r2 } = renderHook(() => useLocalStorageNumber('delay-b', 2000));

    act(() => {
      r1.current[1](5000);
    });

    expect(r1.current[0]).toBe(5000);
    expect(r2.current[0]).toBe(2000);
    expect(localStorage.getItem('delay-a')).toBe('5000');
    expect(localStorage.getItem('delay-b')).toBeNull();
  });
});
