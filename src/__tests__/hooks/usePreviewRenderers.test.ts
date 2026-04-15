import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreviewRenderers } from '../../hooks/usePreviewRenderers';

describe('usePreviewRenderers', () => {
  it('starts with an empty renderers map', () => {
    const { result } = renderHook(() => usePreviewRenderers());
    expect(result.current.renderers.size).toBe(0);
  });

  it('registerPreviewRenderer adds a renderer', () => {
    const { result } = renderHook(() => usePreviewRenderers());

    const renderFn = vi.fn();
    act(() => {
      result.current.registerPreviewRenderer('blockquote', renderFn);
    });

    expect(result.current.renderers.size).toBe(1);
    expect(result.current.renderers.get('blockquote')).toBe(renderFn);
  });

  it('unregisterPreviewRenderer removes a renderer', () => {
    const { result } = renderHook(() => usePreviewRenderers());

    const renderFn = vi.fn();
    act(() => {
      result.current.registerPreviewRenderer('blockquote', renderFn);
    });
    expect(result.current.renderers.size).toBe(1);

    act(() => {
      result.current.unregisterPreviewRenderer('blockquote');
    });
    expect(result.current.renderers.size).toBe(0);
  });

  it('supports multiple node types simultaneously', () => {
    const { result } = renderHook(() => usePreviewRenderers());

    const render1 = vi.fn();
    const render2 = vi.fn();
    act(() => {
      result.current.registerPreviewRenderer('p', render1);
      result.current.registerPreviewRenderer('h1', render2);
    });

    expect(result.current.renderers.size).toBe(2);
    expect(result.current.renderers.get('p')).toBe(render1);
    expect(result.current.renderers.get('h1')).toBe(render2);
  });

  it('unregister of non-existent type is a no-op', () => {
    const { result } = renderHook(() => usePreviewRenderers());

    act(() => {
      result.current.unregisterPreviewRenderer('nonexistent');
    });

    expect(result.current.renderers.size).toBe(0);
  });

  it('overwriting same nodeType replaces the renderer', () => {
    const { result } = renderHook(() => usePreviewRenderers());

    const render1 = vi.fn();
    const render2 = vi.fn();
    act(() => {
      result.current.registerPreviewRenderer('blockquote', render1);
    });
    act(() => {
      result.current.registerPreviewRenderer('blockquote', render2);
    });

    expect(result.current.renderers.size).toBe(1);
    expect(result.current.renderers.get('blockquote')).toBe(render2);
  });

  it('register/unregister callbacks are stable across renders', () => {
    const { result, rerender } = renderHook(() => usePreviewRenderers());

    const reg1 = result.current.registerPreviewRenderer;
    const unreg1 = result.current.unregisterPreviewRenderer;

    rerender();

    expect(result.current.registerPreviewRenderer).toBe(reg1);
    expect(result.current.unregisterPreviewRenderer).toBe(unreg1);
  });
});
