import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSnippetFlow } from '../../hooks/useSnippetFlow';

describe('useSnippetFlow', () => {
  const makeOptions = (overrides?: Partial<{
    cmViewRef: any;
    updateActiveDoc: () => void;
    setEditorCtxMenu: (m: null) => void;
  }>) => ({
    cmViewRef: { current: null },
    updateActiveDoc: vi.fn(),
    setEditorCtxMenu: vi.fn(),
    ...overrides,
  });

  it('starts with showSnippetPicker and showSnippetManager both false', () => {
    const { result } = renderHook(() => useSnippetFlow(makeOptions()));
    expect(result.current.showSnippetPicker).toBe(false);
    expect(result.current.showSnippetManager).toBe(false);
  });

  it('setShowSnippetPicker updates state', () => {
    const { result } = renderHook(() => useSnippetFlow(makeOptions()));
    act(() => { result.current.setShowSnippetPicker(true); });
    expect(result.current.showSnippetPicker).toBe(true);
  });

  it('setShowSnippetManager updates state', () => {
    const { result } = renderHook(() => useSnippetFlow(makeOptions()));
    act(() => { result.current.setShowSnippetManager(true); });
    expect(result.current.showSnippetManager).toBe(true);
  });

  it('openSnippetPicker sets showSnippetPicker true and calls setEditorCtxMenu(null)', () => {
    const setEditorCtxMenu = vi.fn();
    const { result } = renderHook(() =>
      useSnippetFlow(makeOptions({ setEditorCtxMenu })),
    );

    act(() => { result.current.openSnippetPicker(); });

    expect(result.current.showSnippetPicker).toBe(true);
    expect(setEditorCtxMenu).toHaveBeenCalledWith(null);
  });

  it('handleSnippetInsert returns early when cmViewRef.current is null', () => {
    const updateActiveDoc = vi.fn();
    const { result } = renderHook(() =>
      useSnippetFlow(makeOptions({ updateActiveDoc })),
    );

    act(() => {
      result.current.handleSnippetInsert('snip-1', {
        text: 'hello',
        cursorPosition: null,
      });
    });

    expect(updateActiveDoc).not.toHaveBeenCalled();
  });

  it('handleSnippetInsert dispatches and calls updateActiveDoc when view is available', () => {
    const dispatch = vi.fn();
    const focus = vi.fn();
    const updateActiveDoc = vi.fn();
    const cmViewRef = {
      current: {
        state: { selection: { main: { head: 5 } } },
        dispatch,
        focus,
      } as any,
    };

    const { result } = renderHook(() =>
      useSnippetFlow(makeOptions({ cmViewRef, updateActiveDoc })),
    );

    act(() => {
      result.current.handleSnippetInsert('snip-1', {
        text: 'world',
        cursorPosition: 3,
      });
    });

    expect(dispatch).toHaveBeenCalledOnce();
    expect(updateActiveDoc).toHaveBeenCalledWith('world');
    expect(focus).toHaveBeenCalledOnce();
  });
});
