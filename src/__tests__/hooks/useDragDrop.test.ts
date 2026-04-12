import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDragDrop } from '../../hooks/useDragDrop';

const mockOnDragDrop = vi.fn().mockResolvedValue(() => {});
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: mockOnDragDrop,
  }),
}));

describe('useDragDrop', () => {
  it('非 Tauri 环境下不注册事件', () => {
    mockOnDragDrop.mockClear();
    const setIsDragOver = vi.fn();
    const openFileInTab = vi.fn();
    renderHook(() => useDragDrop({
      isTauri: false,
      setIsDragOver,
      openFileInTab,
    }));
    expect(mockOnDragDrop).not.toHaveBeenCalled();
  });

  it('Tauri 环境下注册拖放事件', async () => {
    mockOnDragDrop.mockClear();
    const setIsDragOver = vi.fn();
    const openFileInTab = vi.fn();
    renderHook(() => useDragDrop({
      isTauri: true,
      setIsDragOver,
      openFileInTab,
    }));

    await vi.waitFor(() => {
      expect(mockOnDragDrop).toHaveBeenCalled();
    });
  });
});
