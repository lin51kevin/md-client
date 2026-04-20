import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock @tauri-apps/plugin-fs ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WatchHandler = (event: { type: any }) => void;

/** Flush microtasks so the watch() promise .then() chain resolves. */
const flushPromises = () => vi.waitFor(() => {}, { timeout: 50 });

const watchers = new Map<string, { handler: WatchHandler; unwatch: vi.Mock }>();

vi.mock('@tauri-apps/plugin-fs', () => ({
  watch: vi.fn((path: string, handler: WatchHandler) => {
    const unwatch = vi.fn(() => { watchers.delete(path); });
    watchers.set(path, { handler, unwatch });
    return Promise.resolve(unwatch);
  }),
}));

import { watch } from '@tauri-apps/plugin-fs';
import { useDirWatcher } from '../../hooks/useDirWatcher';

describe('useDirWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchers.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts watching when a directory is in expandedDirs', async () => {
    const onDirChanged = vi.fn();
    const dirs = new Set(['/home/user/project/src']);

    renderHook(() =>
      useDirWatcher({ expandedDirs: dirs, onDirChanged }),
    );

    await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(1));
    expect(watch).toHaveBeenCalledWith('/home/user/project/src', expect.any(Function));
  });

  it('stops watching when a directory is removed from expandedDirs', async () => {
    const onDirChanged = vi.fn();

    const { rerender } = renderHook(
      ({ dirs }) => useDirWatcher({ expandedDirs: dirs, onDirChanged }),
      { initialProps: { dirs: new Set(['/a']) } },
    );

    await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(1));
    await flushPromises();
    expect(watchers.has('/a')).toBe(true);
    const unwatchSpy = watchers.get('/a')!.unwatch;

    // Collapse: empty set
    rerender({ dirs: new Set() });

    expect(unwatchSpy).toHaveBeenCalled();
  });

  it('does not re-watch an already-watched directory (stable identity)', async () => {
    // First render
    const onDirChanged = vi.fn();
    const dirs1 = new Set(['/a']);

    const { rerender } = renderHook(
      ({ dirs }) => useDirWatcher({ expandedDirs: dirs, onDirChanged }),
      { initialProps: { dirs: dirs1 } },
    );

    await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(1));

    // Re-render with a NEW Set containing the same path — should NOT re-watch
    const dirs2 = new Set(['/a']);
    rerender({ dirs: dirs2 });

    // watch should still have been called only once
    expect(watch).toHaveBeenCalledTimes(1);
  });

  it('calls onDirChanged on a structural event (create)', async () => {
    const onDirChanged = vi.fn();
    const dirs = new Set(['/root']);

    renderHook(() => useDirWatcher({ expandedDirs: dirs, onDirChanged }));

    await vi.waitFor(() => watchers.has('/root'));

    // Simulate create event
    act(() => {
      watchers.get('/root')!.handler({ type: { create: 'any' } });
    });

    // Advance past debounce (500ms)
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onDirChanged).toHaveBeenCalledWith('/root');
  });

  it('calls onDirChanged on a remove event', async () => {
    const onDirChanged = vi.fn();
    const dirs = new Set(['/root']);

    renderHook(() => useDirWatcher({ expandedDirs: dirs, onDirChanged }));

    await vi.waitFor(() => watchers.has('/root'));

    act(() => {
      watchers.get('/root')!.handler({ type: { remove: 'any' } });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onDirChanged).toHaveBeenCalledWith('/root');
  });

  it('debounces multiple events within the same directory', async () => {
    const onDirChanged = vi.fn();
    const dirs = new Set(['/root']);

    renderHook(() => useDirWatcher({ expandedDirs: dirs, onDirChanged }));

    await vi.waitFor(() => watchers.has('/root'));

    // Fire 3 events rapidly
    act(() => {
      watchers.get('/root')!.handler({ type: { create: 'any' } });
      watchers.get('/root')!.handler({ type: { remove: 'any' } });
      watchers.get('/root')!.handler({ type: { create: 'any' } });
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should not have fired yet (within debounce window)
    expect(onDirChanged).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Should fire exactly once
    expect(onDirChanged).toHaveBeenCalledTimes(1);
    expect(onDirChanged).toHaveBeenCalledWith('/root');
  });

  it('handles newly added directories while others stay watched', async () => {
    const onDirChanged = vi.fn();

    const { rerender } = renderHook(
      ({ dirs }) => useDirWatcher({ expandedDirs: dirs, onDirChanged }),
      { initialProps: { dirs: new Set(['/a']) } },
    );

    await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(1));

    // Add a new directory
    rerender({ dirs: new Set(['/a', '/b']) });

    await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(2));
    expect(watch).toHaveBeenCalledWith('/b', expect.any(Function));
    // /a should still be watched
    expect(watchers.has('/a')).toBe(true);
    expect(watchers.has('/b')).toBe(true);
  });

  it('stops all watchers when disabled', async () => {
    const onDirChanged = vi.fn();

    const { rerender } = renderHook(
      ({ enabled }) =>
        useDirWatcher({
          expandedDirs: new Set(['/a']),
          onDirChanged,
          enabled,
        }),
      { initialProps: { enabled: true } },
    );

    await vi.waitFor(() => watchers.has('/a'));
    await flushPromises();
    const unwatchSpy = watchers.get('/a')!.unwatch;

    rerender({ enabled: false });

    expect(unwatchSpy).toHaveBeenCalled();
    expect(watchers.size).toBe(0);
  });

  it('handles watch error gracefully', async () => {
    (watch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('too many files'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dirs = new Set(['/bad']);

    renderHook(() =>
      useDirWatcher({ expandedDirs: dirs, onDirChanged: vi.fn() }),
    );

    await act(async () => {
      await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    });

    expect(watchers.has('/bad')).toBe(false);
    consoleSpy.mockRestore();
  });

  it('cleans up all watchers on unmount', async () => {
    const onDirChanged = vi.fn();

    const { unmount } = renderHook(() =>
      useDirWatcher({
        expandedDirs: new Set(['/a', '/b']),
        onDirChanged,
      }),
    );

    await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(2));

    unmount();

    expect(watchers.size).toBe(0);
  });
});
