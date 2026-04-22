import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileWatchState } from '../../hooks/useFileWatchState';
import type { Tab } from '../../types';

// ── Tauri mocks ────────────────────────────────────────────────────────────────

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// useFileWatchState calls useFileWatcher internally; mock the whole watcher so
// we can trigger its callbacks manually.
const mockOnFileChanged = vi.fn();
const mockOnFileDeleted = vi.fn();

vi.mock('../../hooks/useFileWatcher', () => ({
  useFileWatcher: (opts: {
    tabs: Tab[];
    enabled: boolean;
    onFileChanged: (tabId: string, filePath: string) => void;
    onFileDeleted: (tabId: string, filePath: string) => void;
  }) => {
    mockOnFileChanged.mockImplementation(opts.onFileChanged);
    mockOnFileDeleted.mockImplementation(opts.onFileDeleted);
  },
}));

vi.mock('../../hooks/useFileHash', () => ({
  computeHash: vi.fn().mockResolvedValue('newhash'),
  setFileHash: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: 'tab-1',
    filePath: '/path/file.md',
    doc: '# Hello',
    isDirty: false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFileWatchState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初始状态 fileChangeToast 为 null', () => {
    const tabs = [makeTab()];
    const updateTab = vi.fn();

    const { result } = renderHook(() =>
      useFileWatchState({ tabs, enabled: true, autoReload: false, updateTab })
    );

    expect(result.current.fileChangeToast).toBeNull();
  });

  it('非 autoReload 模式：文件变更时展示 toast', () => {
    const tabs = [makeTab()];
    const updateTab = vi.fn();

    const { result } = renderHook(() =>
      useFileWatchState({ tabs, enabled: true, autoReload: false, updateTab })
    );

    act(() => {
      mockOnFileChanged('tab-1', '/path/file.md');
    });

    expect(result.current.fileChangeToast).toEqual({
      type: 'modified',
      tabId: 'tab-1',
      filePath: '/path/file.md',
    });
  });

  it('autoReload 模式且 tab 干净：静默自动重载，不展示 toast', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue('fresh content');

    const tabs = [makeTab({ isDirty: false })];
    const updateTab = vi.fn();

    const { result } = renderHook(() =>
      useFileWatchState({ tabs, enabled: true, autoReload: true, updateTab })
    );

    await act(async () => {
      mockOnFileChanged('tab-1', '/path/file.md');
    });

    expect(result.current.fileChangeToast).toBeNull();
    expect(updateTab).toHaveBeenCalledWith('tab-1', {
      doc: 'fresh content',
      isDirty: false,
    });
  });

  it('autoReload 模式且 tab 有未保存修改：展示 toast 而不自动重载', () => {
    const tabs = [makeTab({ isDirty: true })];
    const updateTab = vi.fn();

    const { result } = renderHook(() =>
      useFileWatchState({ tabs, enabled: true, autoReload: true, updateTab })
    );

    act(() => {
      mockOnFileChanged('tab-1', '/path/file.md');
    });

    expect(result.current.fileChangeToast).toEqual({
      type: 'modified',
      tabId: 'tab-1',
      filePath: '/path/file.md',
    });
    expect(updateTab).not.toHaveBeenCalled();
  });

  it('文件删除：展示 deleted 类型 toast', () => {
    const tabs = [makeTab()];
    const updateTab = vi.fn();

    const { result } = renderHook(() =>
      useFileWatchState({ tabs, enabled: true, autoReload: false, updateTab })
    );

    act(() => {
      mockOnFileDeleted('tab-1', '/path/file.md');
    });

    expect(result.current.fileChangeToast).toEqual({
      type: 'deleted',
      tabId: 'tab-1',
      filePath: '/path/file.md',
    });
  });

  it('setFileChangeToast 可手动清除 toast', () => {
    const tabs = [makeTab()];
    const updateTab = vi.fn();

    const { result } = renderHook(() =>
      useFileWatchState({ tabs, enabled: true, autoReload: false, updateTab })
    );

    act(() => {
      mockOnFileChanged('tab-1', '/path/file.md');
    });
    expect(result.current.fileChangeToast).not.toBeNull();

    act(() => {
      result.current.setFileChangeToast(null);
    });
    expect(result.current.fileChangeToast).toBeNull();
  });

  it('handleReloadFile 在 tabs 变化后仍能正确重载', async () => {
    // 这个测试验证 handleReloadFile 不依赖 tabs 闭包：即使在 tabs 更新后
    // 调用 handleReloadFile，它也能正确找到 tab 并调用 updateTab。
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue('reloaded content');

    const initialTabs = [makeTab()];
    const updateTab = vi.fn();

    const { result, rerender } = renderHook(
      ({ tabs }: { tabs: Tab[] }) =>
        useFileWatchState({ tabs, enabled: true, autoReload: false, updateTab }),
      { initialProps: { tabs: initialTabs } }
    );

    // 更新 tabs（添加一个新 tab），然后调用 handleReloadFile
    const updatedTabs = [makeTab(), makeTab({ id: 'tab-2', filePath: '/other.md' })];
    rerender({ tabs: updatedTabs });

    await act(async () => {
      await result.current.handleReloadFile('tab-1', '/path/file.md');
    });

    expect(invoke).toHaveBeenCalledWith('read_file_text', { path: '/path/file.md' });
    expect(updateTab).toHaveBeenCalledWith('tab-1', {
      doc: 'reloaded content',
      isDirty: false,
    });
  });
});
