import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabActions } from '../../hooks/useTabActions';
import type { Tab } from '../../types';

// Mock @tauri-apps/api/core — invoke('show_unsaved_dialog') returns 'discard' by default
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock pending-images
vi.mock('../../lib/pending-images', () => ({
  getPendingImages: () => [],
  clearPendingImages: () => {},
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

const mockT = (key: string, params?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'app.unsavedPath': 'Untitled.md',
    'common.unsavedChanges': 'Unsaved Changes',
    'app.closeTabUnsaved': '"{name}" has unsaved changes.\n\nPath: {path}',
    'app.unsavedHint': 'Your changes will be lost if you close without saving.',
    'app.unsavedSave': 'Save',
    'app.unsavedDiscard': "Don't Save",
    'app.unsavedCancel': 'Cancel',
  };
  let result = map[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, String(v));
    });
  }
  return result;
};

function makeTabs(overrides: Partial<Tab>[] = []): Tab[] {
  return overrides.map((o, i) => ({
    id: `tab-${i}`,
    filePath: `/test/file${i}.md`,
    doc: '',
    isDirty: false,
    ...o,
  }));
}

describe('useTabActions - close variants', () => {
  const closeTab = vi.fn();
  const closeMultipleTabs = vi.fn();
  const setTabDisplayName = vi.fn();
  const handleDismissWelcome = vi.fn();
  const handleSaveFile = vi.fn<[string], Promise<void>>();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: show_unsaved_dialog resolves to 'discard'
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'show_unsaved_dialog') return 'discard';
      return undefined;
    });
    handleSaveFile.mockResolvedValue(undefined);
  });

  function render(options?: { tabs?: Tab[] }) {
    const tabs = options?.tabs ?? makeTabs();
    return renderHook(() =>
      useTabActions({ tabs, closeTab, closeMultipleTabs, setTabDisplayName, handleDismissWelcome, t: mockT, handleSaveFile })
    );
  }

  describe('handleCloseOtherTabs', () => {
    it('should close all tabs except the specified one', async () => {
      const tabs = makeTabs([
        { id: 'a', filePath: '/a.md' },
        { id: 'b', filePath: '/b.md' },
        { id: 'c', filePath: '/c.md' },
      ]);
      const { result } = render({ tabs });

      await act(async () => {
        await result.current.handleCloseOtherTabs('b');
      });

      expect(closeMultipleTabs).toHaveBeenCalledWith(['a', 'c']);
    });

    it('should not close pinned tabs', async () => {
      const tabs = makeTabs([
        { id: 'a', isPinned: true },
        { id: 'b' },
        { id: 'c' },
      ]);
      const { result } = render({ tabs });

      await act(async () => {
        await result.current.handleCloseOtherTabs('b');
      });

      expect(closeMultipleTabs).toHaveBeenCalledWith(['c']);
    });

    it('should confirm before closing dirty tabs, abort on cancel', async () => {
      mockInvoke.mockImplementation(async (cmd: string) => {
        if (cmd === 'show_unsaved_dialog') return 'cancel';
        return undefined;
      });
      const tabs = makeTabs([
        { id: 'a', isDirty: true },
        { id: 'b' },
        { id: 'c' },
      ]);
      const { result } = render({ tabs });

      await act(async () => {
        await result.current.handleCloseOtherTabs('b');
      });

      expect(mockInvoke).toHaveBeenCalledWith('show_unsaved_dialog', expect.any(Object));
      expect(closeMultipleTabs).not.toHaveBeenCalled();
    });
  });

  describe('handleCloseToLeft', () => {
    it('should close tabs to the left of the pivot', async () => {
      const tabs = makeTabs([
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
      ]);
      const { result } = render({ tabs });

      await act(async () => {
        await result.current.handleCloseToLeft('c');
      });

      expect(closeMultipleTabs).toHaveBeenCalledWith(['a', 'b']);
    });

    it('should skip pinned tabs', async () => {
      const tabs = makeTabs([
        { id: 'a', isPinned: true },
        { id: 'b' },
        { id: 'c' },
      ]);
      const { result } = render({ tabs });

      await act(async () => {
        await result.current.handleCloseToLeft('c');
      });

      expect(closeMultipleTabs).toHaveBeenCalledWith(['b']);
    });
  });

  describe('handleCloseToRight', () => {
    it('should close tabs to the right of the pivot', async () => {
      const tabs = makeTabs([
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
      ]);
      const { result } = render({ tabs });

      await act(async () => {
        await result.current.handleCloseToRight('b');
      });

      expect(closeMultipleTabs).toHaveBeenCalledWith(['c', 'd']);
    });

    it('should skip pinned tabs on the right', async () => {
      const tabs = makeTabs([
        { id: 'a' },
        { id: 'b' },
        { id: 'c', isPinned: true },
        { id: 'd' },
      ]);
      const { result } = render({ tabs });

      await act(async () => {
        await result.current.handleCloseToRight('b');
      });

      expect(closeMultipleTabs).toHaveBeenCalledWith(['d']);
    });
  });
});

