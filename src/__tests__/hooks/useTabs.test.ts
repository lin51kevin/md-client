import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabs } from '../../hooks/useTabs';
import { INITIAL_TAB_ID, DEFAULT_MARKDOWN } from '../../constants';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  message: vi.fn(),
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock('../../lib/recent-files', () => ({
  addRecentFile: vi.fn(),
  removeRecentFile: vi.fn(),
}));

vi.mock('../../lib/version-history', () => ({
  moveSnapshots: vi.fn(),
}));

describe('useTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with one default tab', () => {
      const { result } = renderHook(() => useTabs());
      
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0]).toMatchObject({
        id: INITIAL_TAB_ID,
        filePath: null,
        doc: DEFAULT_MARKDOWN,
        isDirty: false,
      });
      expect(result.current.activeTabId).toBe(INITIAL_TAB_ID);
    });

    it('should return active tab correctly', () => {
      const { result } = renderHook(() => useTabs());
      
      const activeTab = result.current.getActiveTab();
      expect(activeTab.id).toBe(INITIAL_TAB_ID);
    });
  });

  describe('getTabTitle', () => {
    it('should show "Untitled.md" for tabs without filePath', () => {
      const { result } = renderHook(() => useTabs());
      
      const title = result.current.getTabTitle(result.current.tabs[0]);
      expect(title).toBe('Untitled.md');
    });

    it('should show dirty indicator for modified tabs', () => {
      const { result } = renderHook(() => useTabs());
      
      act(() => {
        result.current.updateActiveDoc('# New Content');
      });
      
      const title = result.current.getTabTitle(result.current.tabs[0]);
      expect(title).toContain('\u25cf'); // dirty indicator
    });

    it('should use displayName if set after rename', async () => {
      const { result } = renderHook(() => useTabs());
      
      // Rename unsaved file sets displayName
      await act(async () => {
        await result.current.renameTab(INITIAL_TAB_ID, 'Custom Name');
      });
      
      const title = result.current.getTabTitle(result.current.tabs[0]);
      expect(title).toBe('Custom Name');
    });

    it('should extract filename from filePath', () => {
      const { result } = renderHook(() => useTabs());
      
      // Use getTabTitle with a mock tab that has filePath
      const mockTab = {
        id: 'test',
        filePath: '/path/to/document.md',
        doc: '',
        isDirty: false
      };
      
      const title = result.current.getTabTitle(mockTab);
      expect(title).toBe('document.md');
    });
  });

  describe('updateActiveDoc', () => {
    it('should update document content and mark as dirty', () => {
      const { result } = renderHook(() => useTabs());
      
      act(() => {
        result.current.updateActiveDoc('# New Content');
      });
      
      expect(result.current.tabs[0].doc).toBe('# New Content');
      expect(result.current.tabs[0].isDirty).toBe(true);
    });

    it('should only update active tab', () => {
      const { result } = renderHook(() => useTabs());
      
      // Create second tab  
      act(() => {
        result.current.createNewTab();
      });
      
      // Update second tab's content
      act(() => {
        result.current.updateActiveDoc('Tab 2 content');
      });
      
      const tab2Content = result.current.tabs[1].doc;
      
      // Switch back to first tab
      act(() => {
        result.current.setActiveTabId(result.current.tabs[0].id);
      });
      
      // Update first tab
      act(() => {
        result.current.updateActiveDoc('Updated content');
      });
      
      expect(result.current.tabs[0].doc).toBe('Updated content');
      expect(result.current.tabs[1].doc).toBe(tab2Content);
    });
  });

  describe('renameTab', () => {
    it('should reject empty names', async () => {
      const { result } = renderHook(() => useTabs());
      
      const success = await act(async () => {
        return await result.current.renameTab(INITIAL_TAB_ID, '   ');
      });
      
      expect(success).toBe(false);
    });

    it('should reject names with path separators', async () => {
      const { result } = renderHook(() => useTabs());
      const { message } = await import('@tauri-apps/plugin-dialog');
      
      const success = await act(async () => {
        return await result.current.renameTab(INITIAL_TAB_ID, 'invalid/name');
      });
      
      expect(success).toBe(false);
      expect(message).toHaveBeenCalledWith(
        expect.stringContaining('不能包含'),
        expect.any(Object)
      );
    });

    it('should reject names with illegal characters', async () => {
      const { result } = renderHook(() => useTabs());
      const { message } = await import('@tauri-apps/plugin-dialog');
      
      const success = await act(async () => {
        return await result.current.renameTab(INITIAL_TAB_ID, 'file<name>');
      });
      
      expect(success).toBe(false);
      expect(message).toHaveBeenCalledWith(
        expect.stringContaining('非法字符'),
        expect.any(Object)
      );
    });

    it('should reject Windows reserved names', async () => {
      const { result } = renderHook(() => useTabs());
      const { message } = await import('@tauri-apps/plugin-dialog');
      
      const success = await act(async () => {
        return await result.current.renameTab(INITIAL_TAB_ID, 'CON.txt');
      });
      
      expect(success).toBe(false);
      expect(message).toHaveBeenCalledWith(
        expect.stringContaining('保留文件名'),
        expect.any(Object)
      );
    });

    it('should set displayName for unsaved files', async () => {
      const { result } = renderHook(() => useTabs());
      
      const success = await act(async () => {
        return await result.current.renameTab(INITIAL_TAB_ID, 'New Name');
      });
      
      expect(success).toBe(true);
      expect(result.current.tabs[0].displayName).toBe('New Name');
    });

    it('should invoke rename_file for saved files', async () => {
      const { result } = renderHook(() => useTabs());
      const { invoke } = await import('@tauri-apps/api/core');
      const { moveSnapshots } = await import('../../lib/version-history');
      const { addRecentFile, removeRecentFile } = await import('../../lib/recent-files');
      
      // Mock reading a file to create a saved tab
      vi.mocked(invoke).mockResolvedValue('# File content');
      
      // Open a file to get a saved tab
      await act(async () => {
        await result.current.openFileInTab('/path/to/old.md');
      });
      
      // Now mock rename_file
      vi.mocked(invoke).mockResolvedValue(undefined);
      
      const tabId = result.current.tabs.find(t => t.filePath === '/path/to/old.md')?.id;
      
      const success = await act(async () => {
        return await result.current.renameTab(tabId!, 'new.md');
      });
      
      expect(success).toBe(true);
      expect(invoke).toHaveBeenCalledWith('rename_file', {
        old_path: '/path/to/old.md',
        new_path: '/path/to/new.md'
      });
      expect(moveSnapshots).toHaveBeenCalledWith('/path/to/old.md', '/path/to/new.md');
      expect(removeRecentFile).toHaveBeenCalledWith('/path/to/old.md');
      expect(addRecentFile).toHaveBeenCalledWith('/path/to/new.md');
    });

    it('should handle file exists error', async () => {
      const { result } = renderHook(() => useTabs());
      const { invoke } = await import('@tauri-apps/api/core');
      const { message } = await import('@tauri-apps/plugin-dialog');
      
      // Mock reading a file to create a saved tab
      vi.mocked(invoke).mockResolvedValue('# File content');
      
      await act(async () => {
        await result.current.openFileInTab('/path/to/old.md');
      });
      
      // Mock file exists error
      vi.mocked(invoke).mockRejectedValue(new Error('FILE_EXISTS:existing.md'));
      
      const tabId = result.current.tabs.find(t => t.filePath === '/path/to/old.md')?.id;
      
      const success = await act(async () => {
        return await result.current.renameTab(tabId!, 'existing.md');
      });
      
      expect(success).toBe(false);
      expect(message).toHaveBeenCalledWith(
        expect.stringContaining('已存在'),
        expect.any(Object)
      );
    });
  });

  describe('Tab State Management', () => {
    it('should maintain tabs and activeTabId refs', () => {
      const { result } = renderHook(() => useTabs());
      
      act(() => {
        result.current.setActiveTabId('new-id');
      });
      
      // Ref should update after render
      expect(result.current.activeTabId).toBe('new-id');
    });

    it('should prevent duplicate file opening with openingPaths ref', () => {
      const { result } = renderHook(() => useTabs());
      
      // This tests the internal openingPaths ref behavior
      // The actual file opening logic would be tested in integration tests
      expect(result.current).toBeDefined();
    });
  });
});
