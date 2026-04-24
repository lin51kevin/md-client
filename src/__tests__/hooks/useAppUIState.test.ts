import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../../stores';

// useFocusMode uses fullscreen API
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true, value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true, value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true, writable: true, value: null,
  });
});

const { useAppUIState } = await import('../../hooks/useAppUIState');

describe('useAppUIState', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      showSettings: false,
      showAbout: false,
      showAIPanel: false,
      isDragOver: false,
      dragKind: 'file',
      ctxMenu: null,
      previewCtxMenu: null,
    });
  });

  // ── Modal flags ──────────────────────────────────────────────────

  it('showSettings defaults to false', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.showSettings).toBe(false);
  });

  it('setShowSettings(true) opens settings', () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setShowSettings(true); });
    expect(result.current.showSettings).toBe(true);
  });

  it('openSettings is a stable shorthand for setShowSettings(true)', () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.openSettings(); });
    expect(result.current.showSettings).toBe(true);
  });

  it('showAbout defaults to false and can be toggled', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.showAbout).toBe(false);
    act(() => { result.current.setShowAbout(true); });
    expect(result.current.showAbout).toBe(true);
  });

  it('showAIPanel defaults to false and can be toggled', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.showAIPanel).toBe(false);
    act(() => { result.current.setShowAIPanel(true); });
    expect(result.current.showAIPanel).toBe(true);
  });

  // ── Drag overlay ─────────────────────────────────────────────────

  it('isDragOver defaults to false', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.isDragOver).toBe(false);
  });

  it('setIsDragOver updates isDragOver', () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setIsDragOver(true); });
    expect(result.current.isDragOver).toBe(true);
  });

  it('setDragKind updates dragKind', () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setDragKind('folder'); });
    expect(result.current.dragKind).toBe('folder');
  });

  // ── Context menu ─────────────────────────────────────────────────

  it('ctxMenu defaults to null', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.ctxMenu).toBeNull();
  });

  it('setCtxMenu sets context menu state', () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setCtxMenu({ x: 10, y: 20, tabId: 'tab-1' }); });
    expect(result.current.ctxMenu).toEqual({ x: 10, y: 20, tabId: 'tab-1' });
  });

  it('setCtxMenu(null) clears context menu', () => {
    useUIStore.setState({ ctxMenu: { x: 5, y: 5, tabId: 'abc' } });
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setCtxMenu(null); });
    expect(result.current.ctxMenu).toBeNull();
  });

  // ── focusMode (from useFocusMode) ────────────────────────────────

  it('focusMode defaults to "normal"', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.focusMode).toBe('normal');
  });

  it('isChromeless is false in normal mode', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.isChromeless).toBe(false);
  });

  it('setFocusMode changes focusMode', () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setFocusMode('focus'); });
    expect(result.current.focusMode).toBe('focus');
  });

  // ── Welcome (from useWelcome) ────────────────────────────────────

  it('welcomeDismissed defaults to false', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.welcomeDismissed).toBe(false);
  });

  it('handleDismissWelcome sets welcomeDismissed to true', () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.handleDismissWelcome(); });
    expect(result.current.welcomeDismissed).toBe(true);
  });

  it('handleShowWelcome restores welcomeDismissed to false', () => {
    localStorage.setItem('marklite-welcome-dismissed', 'true');
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.welcomeDismissed).toBe(true);
    act(() => { result.current.handleShowWelcome(); });
    expect(result.current.welcomeDismissed).toBe(false);
  });

  // ── focusStartRef ────────────────────────────────────────────────

  it('focusStartRef is exposed', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current).toHaveProperty('focusStartRef');
  });

  it('focusStartRef is null while not in typewriter mode', () => {
    const { result } = renderHook(() => useAppUIState());
    expect(result.current.focusStartRef.current).toBeNull();
  });

  it('focusStartRef is populated when switching to typewriter mode', async () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setFocusMode('typewriter'); });
    // useEffect runs after render — wait a tick
    await vi.waitFor(() => {
      expect(result.current.focusStartRef.current).not.toBeNull();
    });
  });

  it('focusStartRef is cleared when leaving typewriter mode', async () => {
    const { result } = renderHook(() => useAppUIState());
    act(() => { result.current.setFocusMode('typewriter'); });
    await vi.waitFor(() => { expect(result.current.focusStartRef.current).not.toBeNull(); });
    act(() => { result.current.setFocusMode('normal'); });
    await vi.waitFor(() => { expect(result.current.focusStartRef.current).toBeNull(); });
  });
});
