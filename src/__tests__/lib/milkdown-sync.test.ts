import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MilkdownSyncManager } from '../../../lib/milkdown-sync';

describe('MilkdownSyncManager', () => {
  let manager: MilkdownSyncManager;

  beforeEach(() => {
    manager = new MilkdownSyncManager(100);
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  it('markSource + clearSource basic flow', () => {
    expect(manager.markSource('codemirror')).toBe(true);
    expect(manager.currentSource).toBe('codemirror');
    manager.clearSource();
    expect(manager.currentSource).toBeNull();
  });

  it('prevents loop: codemirror update blocks milkdown callback', () => {
    expect(manager.markSource('codemirror')).toBe(true);
    // Milkdown tries to callback — should be blocked
    expect(manager.markSource('milkdown')).toBe(false);
    expect(manager.currentSource).toBe('codemirror');
  });

  it('prevents loop: milkdown update blocks codemirror callback', () => {
    expect(manager.markSource('milkdown')).toBe(true);
    expect(manager.markSource('codemirror')).toBe(false);
    expect(manager.currentSource).toBe('milkdown');
  });

  it('debounce: only last update fires', () => {
    const cb = vi.fn();
    manager.scheduleUpdate('codemirror', 'v1', cb);
    manager.scheduleUpdate('codemirror', 'v2', cb);
    manager.scheduleUpdate('codemirror', 'v3', cb);

    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('v3');
  });

  it('destroy clears pending timer', () => {
    const cb = vi.fn();
    manager.scheduleUpdate('codemirror', 'v1', cb);
    manager.destroy();
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });
});
