import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileWatcher, markSelfSave } from '../../hooks/useFileWatcher';
import { Tab } from '../../types';

// Mock @tauri-apps/plugin-fs
const mockUnwatch = vi.fn();
const mockWatch = vi.fn().mockResolvedValue(mockUnwatch);

vi.mock('@tauri-apps/plugin-fs', () => ({
  watchImmediate: (...args: unknown[]) => mockWatch(...args),
}));

describe('useFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start watching when a tab with filePath is added', async () => {
    const tabs: Tab[] = [
      { id: 'tab-1', filePath: '/path/file.md', doc: '# Hello', isDirty: false },
    ];
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    renderHook(() =>
      useFileWatcher({ tabs, onFileChanged, onFileDeleted })
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(mockWatch).toHaveBeenCalledWith('/path/file.md', expect.any(Function));
  });

  it('should not watch tabs without filePath', async () => {
    const tabs: Tab[] = [
      { id: 'tab-1', filePath: null, doc: '# Hello', isDirty: false },
    ];
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    renderHook(() =>
      useFileWatcher({ tabs, onFileChanged, onFileDeleted })
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(mockWatch).not.toHaveBeenCalled();
  });

  it('should stop watching when a tab is closed', async () => {
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    const { rerender } = renderHook(
      ({ tabs }: { tabs: Tab[] }) =>
        useFileWatcher({ tabs, onFileChanged, onFileDeleted }),
      {
        initialProps: {
          tabs: [{ id: 'tab-1', filePath: '/path/file.md', doc: '', isDirty: false }],
        },
      }
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(mockWatch).toHaveBeenCalledTimes(1);

    // Close the tab
    rerender({ tabs: [] });
    expect(mockUnwatch).toHaveBeenCalledTimes(1);
  });

  it('should call onFileChanged on modify event (debounced)', async () => {
    const tabs: Tab[] = [
      { id: 'tab-1', filePath: '/path/file.md', doc: '', isDirty: false },
    ];
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    renderHook(() =>
      useFileWatcher({ tabs, onFileChanged, onFileDeleted })
    );

    await vi.advanceTimersByTimeAsync(0);

    // Get the watch callback
    const watchCallback = mockWatch.mock.calls[0][1] as (event: { type: unknown }) => void;

    // Trigger modify event
    watchCallback({ type: { modify: { kind: 'any' } } });

    // Should not fire immediately (debounced)
    expect(onFileChanged).not.toHaveBeenCalled();

    // After 300ms debounce
    await vi.advanceTimersByTimeAsync(300);
    expect(onFileChanged).toHaveBeenCalledWith('tab-1', '/path/file.md');
  });

  it('should debounce multiple events', async () => {
    const tabs: Tab[] = [
      { id: 'tab-1', filePath: '/path/file.md', doc: '', isDirty: false },
    ];
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    renderHook(() =>
      useFileWatcher({ tabs, onFileChanged, onFileDeleted })
    );

    await vi.advanceTimersByTimeAsync(0);
    const watchCallback = mockWatch.mock.calls[0][1] as (event: { type: unknown }) => void;

    // Multiple rapid events
    watchCallback({ type: { modify: { kind: 'any' } } });
    await vi.advanceTimersByTimeAsync(100);
    watchCallback({ type: { modify: { kind: 'data' } } });
    await vi.advanceTimersByTimeAsync(100);
    watchCallback({ type: { modify: { kind: 'any' } } });

    expect(onFileChanged).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    // Should only fire once (debounced)
    expect(onFileChanged).toHaveBeenCalledTimes(1);
  });

  it('should call onFileDeleted on remove event', async () => {
    const tabs: Tab[] = [
      { id: 'tab-1', filePath: '/path/file.md', doc: '', isDirty: false },
    ];
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    renderHook(() =>
      useFileWatcher({ tabs, onFileChanged, onFileDeleted })
    );

    await vi.advanceTimersByTimeAsync(0);
    const watchCallback = mockWatch.mock.calls[0][1] as (event: { type: unknown }) => void;

    watchCallback({ type: { remove: { kind: 'any' } } });
    await vi.advanceTimersByTimeAsync(300);

    expect(onFileDeleted).toHaveBeenCalledWith('tab-1', '/path/file.md');
    expect(onFileChanged).not.toHaveBeenCalled();
  });

  it('should ignore self-triggered changes after markSelfSave', async () => {
    const tabs: Tab[] = [
      { id: 'tab-1', filePath: '/path/file.md', doc: '', isDirty: false },
    ];
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    renderHook(() =>
      useFileWatcher({ tabs, onFileChanged, onFileDeleted })
    );

    await vi.advanceTimersByTimeAsync(0);
    const watchCallback = mockWatch.mock.calls[0][1] as (event: { type: unknown }) => void;

    // Simulate self-save
    markSelfSave('/path/file.md');

    // Immediate watch event should be ignored
    watchCallback({ type: { modify: { kind: 'any' } } });
    await vi.advanceTimersByTimeAsync(300);
    expect(onFileChanged).not.toHaveBeenCalled();

    // After ignore window passes, events should fire again
    await vi.advanceTimersByTimeAsync(1000);
    watchCallback({ type: { modify: { kind: 'any' } } });
    await vi.advanceTimersByTimeAsync(300);
    expect(onFileChanged).toHaveBeenCalledTimes(1);
  });

  it('should not watch when disabled', async () => {
    const tabs: Tab[] = [
      { id: 'tab-1', filePath: '/path/file.md', doc: '', isDirty: false },
    ];
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    renderHook(() =>
      useFileWatcher({ tabs, enabled: false, onFileChanged, onFileDeleted })
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(mockWatch).not.toHaveBeenCalled();
  });

  it('should stop all watchers when disabled after being enabled', async () => {
    const onFileChanged = vi.fn();
    const onFileDeleted = vi.fn();

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useFileWatcher({
          enabled,
          tabs: [{ id: 'tab-1', filePath: '/path/file.md', doc: '', isDirty: false }],
          onFileChanged,
          onFileDeleted,
        }),
      { initialProps: { enabled: true } }
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(mockWatch).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    expect(mockUnwatch).toHaveBeenCalledTimes(1);
  });
});
