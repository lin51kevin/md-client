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

const { useZoom, ZOOM_PRESETS } = await import('../../hooks/useZoom');

describe('useZoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePreferencesStore.setState({ zoomLevel: 100 });
  });

  function createContainerRef() {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return { current: el, cleanup: () => document.body.removeChild(el) };
  }

  it('returns current zoom level from store', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    expect(result.current.zoomLevel).toBe(100);
  });

  it('zoomIn increases zoom by 10', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    act(() => { result.current.zoomIn(); });
    expect(result.current.zoomLevel).toBe(110);
  });

  it('zoomOut decreases zoom by 10', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    act(() => { result.current.zoomOut(); });
    expect(result.current.zoomLevel).toBe(90);
  });

  it('zoomIn clamps at 200', () => {
    usePreferencesStore.setState({ zoomLevel: 200 });
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    act(() => { result.current.zoomIn(); });
    expect(result.current.zoomLevel).toBe(200);
  });

  it('zoomOut clamps at 50', () => {
    usePreferencesStore.setState({ zoomLevel: 50 });
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    act(() => { result.current.zoomOut(); });
    expect(result.current.zoomLevel).toBe(50);
  });

  it('resetZoom sets zoom to 100', () => {
    usePreferencesStore.setState({ zoomLevel: 150 });
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    act(() => { result.current.resetZoom(); });
    expect(result.current.zoomLevel).toBe(100);
  });

  it('setZoomPreset sets exact zoom value', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    act(() => { result.current.setZoomPreset(75); });
    expect(result.current.zoomLevel).toBe(75);
  });

  it('setZoomPreset clamps to valid range', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useZoom(ref));
    act(() => { result.current.setZoomPreset(300); });
    expect(result.current.zoomLevel).toBe(200);
    act(() => { result.current.setZoomPreset(10); });
    expect(result.current.zoomLevel).toBe(50);
  });

  it('Ctrl+wheel down zooms out', () => {
    const { current: el, cleanup } = createContainerRef();
    const ref = { current: el };
    renderHook(() => useZoom(ref));

    act(() => {
      const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true });
      Object.defineProperty(event, 'ctrlKey', { value: true });
      el.dispatchEvent(event);
    });

    expect(usePreferencesStore.getState().zoomLevel).toBe(90);
    cleanup();
  });

  it('Ctrl+wheel up zooms in', () => {
    const { current: el, cleanup } = createContainerRef();
    const ref = { current: el };
    renderHook(() => useZoom(ref));

    act(() => {
      const event = new WheelEvent('wheel', { deltaY: -100, bubbles: true });
      Object.defineProperty(event, 'ctrlKey', { value: true });
      el.dispatchEvent(event);
    });

    expect(usePreferencesStore.getState().zoomLevel).toBe(110);
    cleanup();
  });

  it('wheel without Ctrl does not zoom', () => {
    const { current: el, cleanup } = createContainerRef();
    const ref = { current: el };
    renderHook(() => useZoom(ref));

    act(() => {
      const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true });
      el.dispatchEvent(event);
    });

    expect(usePreferencesStore.getState().zoomLevel).toBe(100);
    cleanup();
  });

  it('Meta+wheel also triggers zoom (macOS)', () => {
    const { current: el, cleanup } = createContainerRef();
    const ref = { current: el };
    renderHook(() => useZoom(ref));

    act(() => {
      const event = new WheelEvent('wheel', { deltaY: -100, bubbles: true });
      Object.defineProperty(event, 'metaKey', { value: true });
      el.dispatchEvent(event);
    });

    expect(usePreferencesStore.getState().zoomLevel).toBe(110);
    cleanup();
  });

  it('ZOOM_PRESETS contains expected values', () => {
    expect(ZOOM_PRESETS).toEqual([50, 75, 80, 100, 110, 125, 150, 200]);
  });
});
