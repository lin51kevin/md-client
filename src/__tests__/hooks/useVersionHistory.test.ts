import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVersionHistory } from '../../hooks/useVersionHistory';

// Mock the version-history lib so tests don't touch localStorage
vi.mock('../../lib/version-history', () => ({
  getSnapshots: vi.fn(() => [{ id: 'snap-1', timestamp: 1000, content: '# Hello' }]),
  createSnapshot: vi.fn(() => [{ id: 'snap-2', timestamp: 2000, content: '# World' }]),
}));

import { getSnapshots, createSnapshot } from '../../lib/version-history';

const makeTab = (overrides?: object) => ({
  id: 'tab-1',
  filePath: '/file.md',
  doc: '# Hello',
  isDirty: false,
  ...overrides,
});

describe('useVersionHistory', () => {
  const rawHandleSaveFile = vi.fn().mockResolvedValue(undefined);
  const getActiveTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rawHandleSaveFile.mockResolvedValue(undefined);
  });

  it('starts with empty snapshots when activeFilePath is null', () => {
    getActiveTab.mockReturnValue(makeTab({ filePath: null }));
    const { result } = renderHook(() =>
      useVersionHistory({
        rawHandleSaveFile,
        getActiveTab,
        tabs: [],
        activeFilePath: null,
      }),
    );
    expect(result.current.snapshots).toEqual([]);
  });

  it('loads snapshots from lib when activeFilePath is set', () => {
    getActiveTab.mockReturnValue(makeTab());
    const { result } = renderHook(() =>
      useVersionHistory({
        rawHandleSaveFile,
        getActiveTab,
        tabs: [],
        activeFilePath: '/file.md',
      }),
    );
    expect(getSnapshots).toHaveBeenCalledWith('/file.md');
    expect(result.current.snapshots).toHaveLength(1);
  });

  it('handleSaveFile calls rawHandleSaveFile', async () => {
    const tab = makeTab();
    getActiveTab.mockReturnValue(tab);
    const { result } = renderHook(() =>
      useVersionHistory({
        rawHandleSaveFile,
        getActiveTab,
        tabs: [tab],
        activeFilePath: '/file.md',
      }),
    );

    await act(async () => { await result.current.handleSaveFile(); });

    expect(rawHandleSaveFile).toHaveBeenCalledOnce();
  });

  it('handleSaveFile creates snapshot when active tab has filePath', async () => {
    const tab = makeTab();
    getActiveTab.mockReturnValue(tab);
    const { result } = renderHook(() =>
      useVersionHistory({
        rawHandleSaveFile,
        getActiveTab,
        tabs: [tab],
        activeFilePath: '/file.md',
      }),
    );

    await act(async () => { await result.current.handleSaveFile(); });

    expect(createSnapshot).toHaveBeenCalledWith('/file.md', '# Hello');
    expect(result.current.snapshots).toHaveLength(1); // updated to mock return value
  });

  it('handleSaveFile does NOT create snapshot when active tab has no filePath', async () => {
    const tab = makeTab({ filePath: null });
    getActiveTab.mockReturnValue(tab);
    const { result } = renderHook(() =>
      useVersionHistory({
        rawHandleSaveFile,
        getActiveTab,
        tabs: [tab],
        activeFilePath: null,
      }),
    );

    await act(async () => { await result.current.handleSaveFile(); });

    expect(createSnapshot).not.toHaveBeenCalled();
  });

  it('handleSaveFile saves a specific tabId when provided', async () => {
    const tab = makeTab({ id: 'tab-2', filePath: '/other.md', doc: '# Other' });
    getActiveTab.mockReturnValue(makeTab());
    const { result } = renderHook(() =>
      useVersionHistory({
        rawHandleSaveFile,
        getActiveTab,
        tabs: [tab],
        activeFilePath: null,
      }),
    );

    await act(async () => { await result.current.handleSaveFile('tab-2'); });

    expect(rawHandleSaveFile).toHaveBeenCalledWith('tab-2');
    expect(createSnapshot).toHaveBeenCalledWith('/other.md', '# Other');
  });
});
