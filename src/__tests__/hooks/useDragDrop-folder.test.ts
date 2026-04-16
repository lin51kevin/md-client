import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDragDrop } from '../../hooks/useDragDrop';

const mockInvoke = vi.fn();
let dragDropHandler: ((event: any) => void) | null = null;

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));
vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: (fn: (event: any) => void) => {
      dragDropHandler = fn;
      return Promise.resolve(() => { dragDropHandler = null; });
    },
  }),
}));

describe('useDragDrop folder handling', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    dragDropHandler = null;
  });

  it('calls onFolderDrop when a directory is dropped', async () => {
    mockInvoke.mockResolvedValue(true); // is_directory returns true
    const onFolderDrop = vi.fn();
    const setIsDragOver = vi.fn();

    renderHook(() => useDragDrop({
      isTauri: true,
      setIsDragOver,
      setDragKind: vi.fn(),
      openFileInTab: vi.fn(),
      onFolderDrop,
    }));

    await waitFor(() => expect(dragDropHandler).not.toBeNull());

    dragDropHandler!({ payload: { type: 'drop', paths: ['/some/folder'] } });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('is_directory', { path: '/some/folder' });
      expect(onFolderDrop).toHaveBeenCalledWith('/some/folder');
    });
  });

  it('does not call onFolderDrop for files', async () => {
    mockInvoke.mockResolvedValue(false); // is_directory returns false
    const onFolderDrop = vi.fn();

    renderHook(() => useDragDrop({
      isTauri: true,
      setIsDragOver: vi.fn(),
      setDragKind: vi.fn(),
      openFileInTab: vi.fn(),
      onFolderDrop,
    }));

    await waitFor(() => expect(dragDropHandler).not.toBeNull());

    dragDropHandler!({ payload: { type: 'drop', paths: ['/some/file.md'] } });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('is_directory', { path: '/some/file.md' });
    });

    expect(onFolderDrop).not.toHaveBeenCalled();
  });

  it('handles missing onFolderDrop gracefully', async () => {
    renderHook(() => useDragDrop({
      isTauri: true,
      setIsDragOver: vi.fn(),
      setDragKind: vi.fn(),
      openFileInTab: vi.fn(),
    }));

    await waitFor(() => expect(dragDropHandler).not.toBeNull());

    // Should not throw
    expect(() => {
      dragDropHandler!({ payload: { type: 'drop', paths: ['/some/folder'] } });
    }).not.toThrow();
  });
});
