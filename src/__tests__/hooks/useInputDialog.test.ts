import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInputDialog } from '../../hooks/useInputDialog';

describe('useInputDialog', () => {
  it('starts with null inputDialogState', () => {
    const { result } = renderHook(() => useInputDialog());
    expect(result.current.inputDialogState).toBeNull();
  });

  it('promptUser sets inputDialogState with config and returns a Promise', async () => {
    const { result } = renderHook(() => useInputDialog());
    const config = { title: 'Enter name', placeholder: 'Name' };

    let promise: Promise<string | null>;
    act(() => {
      promise = result.current.promptUser(config);
    });

    expect(result.current.inputDialogState).not.toBeNull();
    expect(result.current.inputDialogState?.config).toEqual(config);
    expect(result.current.inputDialogState?.resolve).toBeTypeOf('function');

    // Resolve the promise via the stored callback
    act(() => {
      result.current.inputDialogState?.resolve('hello');
    });

    await expect(promise!).resolves.toBe('hello');
  });

  it('promptUser resolves with null when cancelled', async () => {
    const { result } = renderHook(() => useInputDialog());

    let promise: Promise<string | null>;
    act(() => {
      promise = result.current.promptUser({ title: 'Test' });
    });

    act(() => {
      result.current.inputDialogState?.resolve(null);
    });

    await expect(promise!).resolves.toBeNull();
  });

  it('setInputDialogState can clear the state', () => {
    const { result } = renderHook(() => useInputDialog());

    act(() => {
      result.current.promptUser({ title: 'Test' });
    });
    expect(result.current.inputDialogState).not.toBeNull();

    act(() => {
      result.current.setInputDialogState(null);
    });
    expect(result.current.inputDialogState).toBeNull();
  });
});
