import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWelcome } from '../../hooks/useWelcome';

describe('useWelcome', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始状态为未 dismiss', () => {
    const { result } = renderHook(() => useWelcome());
    expect(result.current.welcomeDismissed).toBe(false);
  });

  it('dismiss 后状态为 true 并持久化', () => {
    const { result } = renderHook(() => useWelcome());
    act(() => { result.current.handleDismissWelcome(); });
    expect(result.current.welcomeDismissed).toBe(true);
    expect(localStorage.getItem('marklite-welcome-dismissed')).toBe('true');
  });

  it('showWelcome 清除持久化并恢复状态', () => {
    localStorage.setItem('marklite-welcome-dismissed', 'true');
    const { result } = renderHook(() => useWelcome());
    expect(result.current.welcomeDismissed).toBe(true);
    act(() => { result.current.handleShowWelcome(); });
    expect(result.current.welcomeDismissed).toBe(false);
    expect(localStorage.getItem('marklite-welcome-dismissed')).toBeNull();
  });

  it('已持久化 dismiss 状态下初始化为 true', () => {
    localStorage.setItem('marklite-welcome-dismissed', 'true');
    const { result } = renderHook(() => useWelcome());
    expect(result.current.welcomeDismissed).toBe(true);
  });
});
