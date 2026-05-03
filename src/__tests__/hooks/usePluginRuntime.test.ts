import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePluginRuntime } from '../../hooks/usePluginRuntime';

// Hoisted mocks so they're available inside vi.mock factories
const { mockActivate, mockLoadPluginModule } = vi.hoisted(() => ({
  mockActivate: vi.fn(),
  mockLoadPluginModule: vi.fn(),
}));

// Mock plugin-loader so the hook uses our controlled module loader
vi.mock('../../plugins/plugin-loader', () => ({
  validateManifest: vi.fn((m: unknown) => m),
  checkEngineVersion: vi.fn(() => true),
  loadPluginModuleFromResource: mockLoadPluginModule,
}));

// Mock Tauri APIs used by the production (non-DEV) code path
vi.mock('@tauri-apps/api/path', () => ({
  resolveResource: vi.fn(async (p: string) => p),
}));
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(async () =>
    JSON.stringify({ id: 'test', name: 'Test', version: '1.0.0', main: 'dist/index.js' }),
  ),
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
  const savedDEV = import.meta.env.DEV;

  beforeEach(() => {
    vi.clearAllMocks();
    // Force the production code path (which uses loadPluginModuleFromResource)
    import.meta.env.DEV = false as unknown as boolean;
    mockLoadPluginModule.mockResolvedValue({ activate: mockActivate });
    mockActivate.mockReturnValue(undefined);
  });

  afterEach(() => {
    import.meta.env.DEV = savedDEV;
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

    await act(async () => {
      await result.current.activatePlugin('marklite-backlinks');
    });

    expect(mockActivate).toHaveBeenCalledTimes(1);
    const ctx = mockActivate.mock.calls[0][0];
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

    await act(async () => {
      await result.current.activatePlugin('marklite-graph-view');
    });

    expect(mockActivate).toHaveBeenCalledTimes(1);
  });

  it('deactivatePlugin calls deactivate returned by activate', async () => {
    const deactivateFn = vi.fn();
    mockActivate.mockReturnValue({ deactivate: deactivateFn });

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
    mockActivate.mockReturnValue({ deactivate: deactivateFn });

    const deps = createMockDeps();
    const { result } = renderHook(() => usePluginRuntime(deps));

    await act(async () => {
      await result.current.activatePlugin('marklite-backlinks');
    });
    await act(async () => {
      await result.current.activatePlugin('marklite-backlinks');
    });

    expect(deactivateFn).toHaveBeenCalledTimes(1);
    expect(mockActivate).toHaveBeenCalledTimes(2);
  });
});
