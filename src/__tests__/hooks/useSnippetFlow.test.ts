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

  it('handleSnippetInsert dispatches and calls updateActiveDoc with full doc when view is available', () => {
    const dispatch = vi.fn();
    const focus = vi.fn();
    const updateActiveDoc = vi.fn();
    const fullDoc = 'existing content world';
    const cmViewRef = {
      current: {
        state: {
          selection: { main: { from: 17, to: 17, head: 17 } },
          doc: { toString: () => fullDoc },
        },
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
    // updateActiveDoc must receive full doc, not just snippet text
    expect(updateActiveDoc).toHaveBeenCalledWith(fullDoc);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('handleSnippetInsert replaces selected text (from !== to)', () => {
    const dispatch = vi.fn();
    const focus = vi.fn();
    const updateActiveDoc = vi.fn();
    const cmViewRef = {
      current: {
        state: {
          selection: { main: { from: 5, to: 10, head: 10 } },
          doc: { toString: () => 'after insert' },
        },
        dispatch,
        focus,
      } as any,
    };

    const { result } = renderHook(() =>
      useSnippetFlow(makeOptions({ cmViewRef, updateActiveDoc })),
    );

    act(() => {
      result.current.handleSnippetInsert('snip-1', {
        text: 'replacement',
        cursorPosition: null,
      });
    });

    const dispatchArg = dispatch.mock.calls[0][0];
    expect(dispatchArg.changes).toEqual({ from: 5, to: 10, insert: 'replacement' });
  });
});
