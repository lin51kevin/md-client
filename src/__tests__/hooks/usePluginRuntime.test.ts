import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePluginRuntime } from '../../hooks/usePluginRuntime';

// Mock the official plugin modules
vi.mock('../../plugins/official/backlinks/src/index', () => ({
  activate: vi.fn(),
}));
vi.mock('../../plugins/official/graph-view/src/index', () => ({
  activate: vi.fn(),
}));

function createMockDeps() {
  return {
    getActiveTab: vi.fn(() => ({ path: '/test.md', content: '# hello' })),
    openFileInTab: vi.fn(),
    getOpenFilePaths: vi.fn(() => ['/test.md']),
    cmViewRef: { current: null },
    registerSidebarPanel: vi.fn(),
    unregisterSidebarPanel: vi.fn(),
    addStatusBarItem: vi.fn(),
    removeStatusBarItem: vi.fn(),
    registerPreviewRenderer: vi.fn(),
    unregisterPreviewRenderer: vi.fn(),
  };
}

describe('usePluginRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns activatePlugin and deactivatePlugin callbacks', () => {
    const deps = createMockDeps();
    const { result } = renderHook(() => usePluginRuntime(deps));

    expect(typeof result.current.activatePlugin).toBe('function');
    expect(typeof result.current.deactivatePlugin).toBe('function');
  });

  it('activatePlugin calls official plugin activate with sandboxed context', async () => {
    const deps = createMockDeps();
    const { result } = renderHook(() => usePluginRuntime(deps));

    const backlinksMod = await import('../../plugins/official/backlinks/src/index');

    await act(async () => {
      await result.current.activatePlugin('marklite-backlinks');
    });

    expect(backlinksMod.activate).toHaveBeenCalledTimes(1);
    // Should receive a PluginContext-shaped object
    const ctx = (backlinksMod.activate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(ctx).toBeDefined();
    expect(ctx.editor).toBeDefined();
    expect(ctx.sidebar).toBeDefined();
    expect(ctx.preview).toBeDefined();
  });

  it('deactivatePlugin is safe to call even if plugin was not activated', async () => {
    const deps = createMockDeps();
    const { result } = renderHook(() => usePluginRuntime(deps));

    // Should not throw
    await act(async () => {
      await result.current.deactivatePlugin('nonexistent');
    });
  });

  it('activatePlugin for marklite-graph-view calls its activate', async () => {
    const deps = createMockDeps();
    const { result } = renderHook(() => usePluginRuntime(deps));

    const graphMod = await import('../../plugins/official/graph-view/src/index');

    await act(async () => {
      await result.current.activatePlugin('marklite-graph-view');
    });

    expect(graphMod.activate).toHaveBeenCalledTimes(1);
  });

  it('deactivatePlugin calls deactivate returned by activate', async () => {
    const deactivateFn = vi.fn();
    const backlinksMod = await import('../../plugins/official/backlinks/src/index');
    (backlinksMod.activate as ReturnType<typeof vi.fn>).mockReturnValue({
      deactivate: deactivateFn,
    });

    const deps = createMockDeps();
    const { result } = renderHook(() => usePluginRuntime(deps));

    await act(async () => {
      await result.current.activatePlugin('marklite-backlinks');
    });

    await act(async () => {
      await result.current.deactivatePlugin('marklite-backlinks');
    });

    expect(deactivateFn).toHaveBeenCalledTimes(1);
  });

  it('re-activating an already active plugin deactivates first', async () => {
    const deactivateFn = vi.fn();
    const backlinksMod = await import('../../plugins/official/backlinks/src/index');
    (backlinksMod.activate as ReturnType<typeof vi.fn>).mockReturnValue({
      deactivate: deactivateFn,
    });

    const deps = createMockDeps();
    const { result } = renderHook(() => usePluginRuntime(deps));

    await act(async () => {
      await result.current.activatePlugin('marklite-backlinks');
    });
    await act(async () => {
      await result.current.activatePlugin('marklite-backlinks');
    });

    expect(deactivateFn).toHaveBeenCalledTimes(1);
    expect(backlinksMod.activate).toHaveBeenCalledTimes(2);
  });
});
