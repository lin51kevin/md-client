import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWindowTitle } from '../../hooks/useWindowTitle';
import { Tab } from '../../types';

// Mock Tauri window API
const mockSetTitle = vi.fn();

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    setTitle: mockSetTitle,
  })),
}));

describe('useWindowTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tauri Environment', () => {
    it('should set window title for saved file', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/path/to/document.md',
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      expect(mockSetTitle).toHaveBeenCalledWith('document.md - MarkLite++');
    });

    it('should set window title for new file (no filePath, no displayName)', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: null,
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      // No filePath and no displayName → just the app name
      expect(mockSetTitle).toHaveBeenCalledWith('MarkLite++');
    });

    it('should add asterisk prefix for dirty files', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/path/to/document.md',
        doc: '# Content',
        isDirty: true,
      };

      renderHook(() => useWindowTitle(tab, true));

      expect(mockSetTitle).toHaveBeenCalledWith('*document.md - MarkLite++');
    });

    it('should set plain MarkLite++ title for dirty new files with no displayName', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: null,
        doc: '# Content',
        isDirty: true,
      };

      renderHook(() => useWindowTitle(tab, true));

      // No name available → just 'MarkLite++', no prefix
      expect(mockSetTitle).toHaveBeenCalledWith('MarkLite++');
    });

    it('should extract filename from Windows path', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: 'C:\\Users\\Documents\\readme.md',
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      expect(mockSetTitle).toHaveBeenCalledWith('readme.md - MarkLite++');
    });

    it('should extract filename from Unix path', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/home/user/documents/notes.md',
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      expect(mockSetTitle).toHaveBeenCalledWith('notes.md - MarkLite++');
    });

    it('should update title when tab changes', () => {
      const tab1: Tab = {
        id: 'tab-1',
        filePath: '/path/file1.md',
        doc: '# Content',
        isDirty: false,
      };

      const { rerender } = renderHook(
        ({ tab }) => useWindowTitle(tab, true),
        { initialProps: { tab: tab1 } }
      );

      expect(mockSetTitle).toHaveBeenCalledWith('file1.md - MarkLite++');

      const tab2: Tab = {
        id: 'tab-2',
        filePath: '/path/file2.md',
        doc: '# Other Content',
        isDirty: false,
      };

      rerender({ tab: tab2 });

      expect(mockSetTitle).toHaveBeenCalledWith('file2.md - MarkLite++');
    });

    it('should update title when dirty state changes', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/path/document.md',
        doc: '# Content',
        isDirty: false,
      };

      const { rerender } = renderHook(
        ({ tab }) => useWindowTitle(tab, true),
        { initialProps: { tab } }
      );

      expect(mockSetTitle).toHaveBeenCalledWith('document.md - MarkLite++');

      const dirtyTab = { ...tab, isDirty: true };
      rerender({ tab: dirtyTab });

      expect(mockSetTitle).toHaveBeenCalledWith('*document.md - MarkLite++');
    });

    it('should update title when file path changes', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: null,
        doc: '# Content',
        isDirty: false,
      };

      const { rerender } = renderHook(
        ({ tab }) => useWindowTitle(tab, true),
        { initialProps: { tab } }
      );

      // No filePath and no displayName → just app name
      expect(mockSetTitle).toHaveBeenCalledWith('MarkLite++');

      const savedTab = { ...tab, filePath: '/path/saved.md' };
      rerender({ tab: savedTab });

      expect(mockSetTitle).toHaveBeenCalledWith('saved.md - MarkLite++');
    });
  });

  describe('Non-Tauri Environment', () => {
    it('should not set title in browser environment', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/path/document.md',
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, false));

      expect(mockSetTitle).not.toHaveBeenCalled();
    });

    it('should not update title when tab changes in browser', () => {
      const tab1: Tab = {
        id: 'tab-1',
        filePath: '/path/file1.md',
        doc: '# Content',
        isDirty: false,
      };

      const { rerender } = renderHook(
        ({ tab }) => useWindowTitle(tab, false),
        { initialProps: { tab: tab1 } }
      );

      const tab2: Tab = {
        id: 'tab-2',
        filePath: '/path/file2.md',
        doc: '# Other Content',
        isDirty: false,
      };

      rerender({ tab: tab2 });

      expect(mockSetTitle).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle file paths with only filename', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: 'document.md',
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      expect(mockSetTitle).toHaveBeenCalledWith('document.md - MarkLite++');
    });

    it('should handle file paths with trailing slash', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/path/to/folder/',
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      // Should handle gracefully (empty string after last slash)
      expect(mockSetTitle).toHaveBeenCalled();
    });

    it('should handle very long file names', () => {
      const longName = 'a'.repeat(200) + '.md';
      const tab: Tab = {
        id: 'tab-1',
        filePath: `/path/${longName}`,
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      expect(mockSetTitle).toHaveBeenCalledWith(`${longName} - MarkLite++`);
    });

    it('should handle file paths with special characters', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/path/文档 (1).md',
        doc: '# Content',
        isDirty: false,
      };

      renderHook(() => useWindowTitle(tab, true));

      expect(mockSetTitle).toHaveBeenCalledWith('文档 (1).md - MarkLite++');
    });
  });

  describe('Effect Cleanup', () => {
    it('should not call setTitle after unmount', () => {
      const tab: Tab = {
        id: 'tab-1',
        filePath: '/path/document.md',
        doc: '# Content',
        isDirty: false,
      };

      const { unmount } = renderHook(() => useWindowTitle(tab, true));

      mockSetTitle.mockClear();
      
      unmount();

      // No additional calls after unmount
      expect(mockSetTitle).not.toHaveBeenCalled();
    });
  });
});
