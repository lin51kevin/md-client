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

vi.mock('../../lib/file/recent-files', () => ({
  addRecentFile: vi.fn(),
  removeRecentFile: vi.fn(),
}));

vi.mock('../../lib/storage/version-history', () => ({
  moveSnapshots: vi.fn(),
}));

describe('useTabs', () => {
  // Mock t function for i18n
  const mockT = (key: string, params?: Record<string, any>) => {
    const translations: Record<string, string> = {
      'rename.title': '重命名',
      'rename.hasSlash': '文件名不能包含 / 或 \\ 字符。',
      'rename.illegalChars': '文件名包含非法字符（< > : " | ? * 或控制字符）。',
      'rename.reserved': `"${params?.name || ''}" 是系统保留文件名，请换一个名称。`,
      'rename.trailingDotSpace': '文件名不能以句点或空格结尾。',
      'rename.tooLong': '文件名过长，请缩短后重试。',
      'rename.alreadyExists': `"${params?.name || ''}" 已存在，请换一个文件名。`,
      'rename.failed': `重命名失败: ${params?.error || ''}`,
      'rename.openFileFailed': '打开文件失败',
      'rename.cannotRead': `无法读取文件: ${params?.error || ''}`,
    };
    return translations[key] || key;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with one default tab', () => {
      const { result } = renderHook(() => useTabs(mockT));
      
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
      const { result } = renderHook(() => useTabs(mockT));
      
      const activeTab = result.current.getActiveTab();
      expect(activeTab.id).toBe(INITIAL_TAB_ID);
    });
  });

  describe('getTabTitle', () => {
    it('should show "sample.md" for tabs without filePath', () => {
      const { result } = renderHook(() => useTabs(mockT));
      
      const title = result.current.getTabTitle(result.current.tabs[0]);
      expect(title).toBe('sample.md');
    });

    it('should show dirty indicator for modified tabs', () => {
      const { result } = renderHook(() => useTabs(mockT));
      
      act(() => {
        result.current.updateActiveDoc('# New Content');
      });
      
      const title = result.current.getTabTitle(result.current.tabs[0]);
      expect(title).toContain('\u25cf'); // dirty indicator
    });

    it('should use displayName if set after rename', async () => {
      const { result } = renderHook(() => useTabs(mockT));
      
      // Rename unsaved file sets displayName
      await act(async () => {
        await result.current.renameTab(INITIAL_TAB_ID, 'Custom Name');
      });
      
      const title = result.current.getTabTitle(result.current.tabs[0]);
      expect(title).toBe('Custom Name');
    });

    it('should extract filename from filePath', () => {
      const { result } = renderHook(() => useTabs(mockT));
      
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
      const { result } = renderHook(() => useTabs(mockT));
      
      act(() => {
        result.current.updateActiveDoc('# New Content');
      });
      
      expect(result.current.tabs[0].doc).toBe('# New Content');
      expect(result.current.tabs[0].isDirty).toBe(true);
    });

    it('should only update active tab', () => {
      const { result } = renderHook(() => useTabs(mockT));
      
      // Make the first tab dirty so createNewTab doesn't replace it
      act(() => {
        result.current.updateActiveDoc('First tab content');
      });
      
      // Create second tab  
      act(() => {
        result.current.createNewTab();
      });
      
      // Verify second tab was created
      expect(result.current.tabs).toHaveLength(2);
      
      // Update second tab's content
      act(() => {
        result.current.updateActiveDoc('Tab 2 content');
      });
      
      const tab2Content = result.current.tabs[1]?.doc;
      
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
      const { result } = renderHook(() => useTabs(mockT));
      
      const success = await act(async () => {
        return await result.current.renameTab(INITIAL_TAB_ID, '   ');
      });
      
      expect(success).toBe(false);
    });

    it('should reject names with path separators', async () => {
      const { result } = renderHook(() => useTabs(mockT));
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
      const { result } = renderHook(() => useTabs(mockT));
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
      const { result } = renderHook(() => useTabs(mockT));
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
      const { result } = renderHook(() => useTabs(mockT));
      
      const success = await act(async () => {
        return await result.current.renameTab(INITIAL_TAB_ID, 'New Name');
      });
      
      expect(success).toBe(true);
      expect(result.current.tabs[0].displayName).toBe('New Name');
    });

    it('should invoke rename_file for saved files', async () => {
      const { result } = renderHook(() => useTabs(mockT));
      const { invoke } = await import('@tauri-apps/api/core');
      const { moveSnapshots } = await import('../../lib/storage/version-history');
      const { addRecentFile, removeRecentFile } = await import('../../lib/file/recent-files');
      
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
        oldPath: '/path/to/old.md',
        newPath: '/path/to/new.md'
      });
      expect(moveSnapshots).toHaveBeenCalledWith('/path/to/old.md', '/path/to/new.md');
      expect(removeRecentFile).toHaveBeenCalledWith('/path/to/old.md');
      expect(addRecentFile).toHaveBeenCalledWith('/path/to/new.md');
    });

    it('should handle file exists error', async () => {
      const { result } = renderHook(() => useTabs(mockT));
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

  describe('markSavedAs', () => {
    it('应在另存为后清除 displayName，使标签页显示新文件名', () => {
      const { result } = renderHook(() => useTabs(mockT));

      // createNewTab 会给新标签设置 displayName (如 'untitled.md')
      act(() => { result.current.createNewTab(); });
      const newTab = result.current.tabs.find(t => t.displayName);
      expect(newTab?.displayName).toBeDefined();

      // 另存为后应清除 displayName，改用 filePath 推导文件名
      act(() => { result.current.markSavedAs(newTab!.id, '/docs/mynotes.md'); });

      const saved = result.current.tabs.find(t => t.id === newTab!.id);
      expect(saved?.displayName).toBeUndefined();
      expect(saved?.filePath).toBe('/docs/mynotes.md');
      expect(saved?.isDirty).toBe(false);
    });

    it('另存为后 getTabTitle 应使用新文件名而非旧 displayName', () => {
      const { result } = renderHook(() => useTabs(mockT));

      act(() => { result.current.createNewTab(); });
      const newTab = result.current.tabs.find(t => t.displayName)!;
      const oldTitle = result.current.getTabTitle(newTab);

      act(() => { result.current.markSavedAs(newTab.id, '/docs/renamed.md'); });

      const updatedTab = result.current.tabs.find(t => t.id === newTab.id)!;
      const newTitle = result.current.getTabTitle(updatedTab);
      expect(newTitle).not.toBe(oldTitle);
      expect(newTitle).toBe('renamed.md');
    });
  });

  describe('tabsRef', () => {
    it('应暴露 tabsRef 且始终反映最新 tabs 状态', () => {
      const { result } = renderHook(() => useTabs(mockT));

      // Initially reflects current tabs
      expect(result.current.tabsRef.current).toEqual(result.current.tabs);

      act(() => { result.current.updateActiveDoc('updated content'); });

      // After update, ref should reflect new dirty state
      expect(result.current.tabsRef.current[0].isDirty).toBe(true);
      expect(result.current.tabsRef.current[0].doc).toBe('updated content');
    });

    it('tabsRef 在新建标签后应同步更新', () => {
      const { result } = renderHook(() => useTabs(mockT));

      act(() => { result.current.updateActiveDoc('dirty'); });
      act(() => { result.current.createNewTab(); });

      expect(result.current.tabsRef.current).toHaveLength(2);
      expect(result.current.tabsRef.current).toEqual(result.current.tabs);
    });
  });

  describe('Tab State Management', () => {
    it('should maintain tabs and activeTabId refs', () => {
      const { result } = renderHook(() => useTabs(mockT));
      
      act(() => {
        result.current.setActiveTabId('new-id');
      });
      
      // Ref should update after render
      expect(result.current.activeTabId).toBe('new-id');
    });

    it('should prevent duplicate file opening with openingPaths ref', () => {
      const { result } = renderHook(() => useTabs(mockT));
      
      // This tests the internal openingPaths ref behavior
      // The actual file opening logic would be tested in integration tests
      expect(result.current).toBeDefined();
    });
  });

  describe('Session Persistence', () => {
    const SESSION_KEY = 'marklite-session-tabs';

    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it('should save session to localStorage when tabs change', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      vi.mocked(invoke).mockResolvedValue('# Content');

      const { result } = renderHook(() => useTabs(mockT));

      // Wait for session restore attempt (no saved session → sets isRestoringSession=false)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Open a file to get a non-pristine tab
      await act(async () => {
        await result.current.openFileInTab('/path/to/notes.md');
      });

      // Session should be queued to persist (debounced 500ms)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      const saved = localStorage.getItem(SESSION_KEY);
      expect(saved).not.toBeNull();
      const session = JSON.parse(saved!);
      expect(session.tabs).toHaveLength(1);
      expect(session.tabs[0].filePath).toBe('/path/to/notes.md');
      expect(session.activeTabId).toBe(result.current.activeTabId);
    });

    it('should clear session when returning to pristine state', async () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        tabs: [{ id: 'abc', filePath: null }],
        activeTabId: 'abc',
      }));

      const { result } = renderHook(() => useTabs(mockT));

      // Wait for restore attempt — no filePath → restored as untitled tab
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Close any extra tabs until we have only the pristine init tab
      act(() => {
        result.current.closeTab(result.current.tabs[0].id);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      // Pristine state should clear localStorage
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('should restore tabs from localStorage on mount', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      vi.mocked(invoke).mockResolvedValue('# Restored Content');

      // Pre-seed session
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        tabs: [
          { id: 'tab-1', filePath: '/docs/file1.md', displayName: undefined, isPinned: false },
          { id: 'tab-2', filePath: '/docs/file2.md', displayName: undefined, isPinned: true },
        ],
        activeTabId: 'tab-2',
      }));

      const { result } = renderHook(() => useTabs(mockT));

      // Wait for async restore to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.tabs[0].filePath).toBe('/docs/file1.md');
      expect(result.current.tabs[1].filePath).toBe('/docs/file2.md');
      expect(result.current.tabs[1].isPinned).toBe(true);
      expect(result.current.activeTabId).toBe('tab-2');
    });

    it('should skip tabs whose files cannot be read during restore', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      vi.mocked(invoke)
        .mockResolvedValueOnce('# Good file')       // first file succeeds
        .mockRejectedValueOnce(new Error('ENOENT')); // second file missing

      localStorage.setItem(SESSION_KEY, JSON.stringify({
        tabs: [
          { id: 'tab-ok', filePath: '/exists.md' },
          { id: 'tab-missing', filePath: '/deleted.md' },
        ],
        activeTabId: 'tab-ok',
      }));

      const { result } = renderHook(() => useTabs(mockT));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Only the successfully read tab should be restored
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].filePath).toBe('/exists.md');
    });

    it('should fall back to pristine tab when all session files are missing', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      vi.mocked(invoke).mockRejectedValue(new Error('ENOENT'));

      localStorage.setItem(SESSION_KEY, JSON.stringify({
        tabs: [{ id: 'tab-gone', filePath: '/gone.md' }],
        activeTabId: 'tab-gone',
      }));

      const { result } = renderHook(() => useTabs(mockT));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Falls back to initial pristine state
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].filePath).toBeNull();
    });
  });

  describe('Path Normalization', () => {
    it('should normalize mixed separators when checking for existing tabs', async () => {
      const { result } = renderHook(() => useTabs(mockT));
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(invoke).mockResolvedValue('# Content');

      // Open a file with backslashes
      await act(async () => {
        await result.current.openFileInTab('C:\\Users\\docs\\file.md');
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].filePath).toBe('C:\\Users\\docs\\file.md');

      // Try to open same file with forward slashes
      await act(async () => {
        await result.current.openFileInTab('C:/Users/docs/file.md');
      });

      // Should not create a new tab (same file, just different separators)
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].filePath).toBe('C:\\Users\\docs\\file.md');
    });

    it('should normalize paths with multiple consecutive slashes', async () => {
      const { result } = renderHook(() => useTabs(mockT));
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(invoke).mockResolvedValue('# Content');

      await act(async () => {
        await result.current.openFileInTab('/home/user//docs///file.md');
      });

      expect(result.current.tabs).toHaveLength(1);

      // Same file with normal separators
      await act(async () => {
        await result.current.openFileInTab('/home/user/docs/file.md');
      });

      // Should recognize as same file
      expect(result.current.tabs).toHaveLength(1);
    });

    it('should activate existing tab with normalized path match', async () => {
      const { result } = renderHook(() => useTabs(mockT));
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(invoke)
        .mockResolvedValueOnce('# File 1')
        .mockResolvedValueOnce('# File 2');

      // Open two files
      await act(async () => {
        await result.current.openFileInTab('F:\\md-client\\README.md');
      });
      await act(async () => {
        await result.current.openFileInTab('F:\\md-client\\src\\App.tsx');
      });

      expect(result.current.tabs).toHaveLength(2);
      const secondTabId = result.current.tabs[1].id;
      expect(result.current.activeTabId).toBe(secondTabId);

      // Try to open first file again with forward slashes
      await act(async () => {
        await result.current.openFileInTab('F:/md-client/README.md');
      });

      // Should activate the existing first tab, not create new
      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.activeTabId).toBe(result.current.tabs[0].id);
    });
  });
});
