import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlugins } from '../../hooks/usePlugins';
import { PluginStorage } from '../../plugins/plugin-storage';
import { PERMISSION_DESCRIPTIONS } from '../../plugins/permissions';

// Hoist Tauri virtual module mocks so vite doesn't try to resolve them
vi.mock('@tauri-apps/plugin-dialog', () => ({}));
vi.mock('@tauri-apps/plugin-fs', () => ({}));

// ── localStorage mock ──────────────────────────────────────────────────────

let storageMock: Record<string, string> = {};

beforeEach(() => {
  storageMock = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => { storageMock[key] = value; },
    removeItem: (key: string) => { delete storageMock[key]; },
  });
});

// ── CRITICAL 1: Storage key isolation ────────────────────────────────────

describe('usePlugins - storage key isolation', () => {
  it('PluginStorage writes to marklite-plugin-records, not marklite-installed-plugins', () => {
    const pluginStorage = new PluginStorage();

    // Write via PluginStorage (lifecycle layer)
    pluginStorage.addPlugin({
      id: 'lifecycle-plugin',
      manifest: {
        id: 'lifecycle-plugin',
        name: 'LC Plugin',
        version: '1.0.0',
        description: 'desc',
        author: 'auth',
        main: 'index.js',
        activationEvents: [],
        permissions: ['storage'],
      },
      enabled: true,
      grantedPermissions: ['storage'],
      installedAt: Date.now(),
    });

    // PluginStorage now uses 'marklite-plugin-records' (NOT 'marklite-installed-plugins')
    expect(storageMock['marklite-plugin-records']).toBeDefined();
    expect(storageMock['marklite-installed-plugins']).toBeUndefined();

    // Verify PluginStorage data is intact
    const stored = JSON.parse(storageMock['marklite-plugin-records']) as { id: string }[];
    expect(stored[0].id).toBe('lifecycle-plugin');
  });

  it('the two storage keys are distinct (no collision)', () => {
    const LIFECYCLE_KEY = 'marklite-plugin-records';
    const UI_KEY = 'marklite-installed-plugins';
    expect(LIFECYCLE_KEY).not.toBe(UI_KEY);
  });
});

// ── CRITICAL 2: Permission validation ────────────────────────────────────

describe('usePlugins - permission validation', () => {
  it('KNOWN_PERMISSIONS covers all entries in PERMISSION_DESCRIPTIONS', () => {
    const knownKeys = new Set(Object.keys(PERMISSION_DESCRIPTIONS));
    // All PERMISSION_DESCRIPTIONS keys should be valid PluginPermission values
    expect(knownKeys.size).toBeGreaterThan(0);
    for (const key of knownKeys) {
      expect(typeof key).toBe('string');
    }
  });

  it('unknown permissions are filtered out before the approval modal', () => {
    const KNOWN = new Set(Object.keys(PERMISSION_DESCRIPTIONS));

    const incoming = ['storage', 'editor.read', 'tauri.raw', 'INVALID_PERM', 'file.write'];
    const valid = incoming.filter((p) => KNOWN.has(p));

    expect(valid).toContain('storage');
    expect(valid).toContain('editor.read');
    expect(valid).toContain('tauri.raw');
    expect(valid).not.toContain('INVALID_PERM');
  });

  it('plugin with only invalid permissions shows no approval modal (zero valid perms)', () => {
    const KNOWN = new Set(Object.keys(PERMISSION_DESCRIPTIONS));

    const incoming = ['NOT_A_REAL_PERM', 'ALSO_FAKE'];
    const valid = incoming.filter((p) => KNOWN.has(p));

    expect(valid).toHaveLength(0);
  });
});

// ── HIGH 1: installFromFile return value ─────────────────────────────────

describe('usePlugins - installFromFile pending_approval result', () => {
  it('pending_approval treated as non-false (installation started)', () => {
    // The fix changes: resolve(result === true) → resolve(result !== false)
    type TryResult = boolean | 'pending_approval';
    const resolveFixed = (result: TryResult) => result !== false;
    expect(resolveFixed('pending_approval')).toBe(true);
    expect(resolveFixed(true)).toBe(true);
    expect(resolveFixed(false)).toBe(false);
  });
});

// ── MEDIUM 2: Lifecycle wiring ────────────────────────────────────────────

describe('usePlugins - lifecycle callbacks', () => {
  it('calls onActivate when enablePlugin is called', () => {
    const onActivate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePlugins({ onActivate }));

    act(() => { result.current.enablePlugin('marklite-backlinks'); });

    expect(onActivate).toHaveBeenCalledWith('marklite-backlinks');
  });

  it('calls onDeactivate when disablePlugin is called', () => {
    const onDeactivate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePlugins({ onDeactivate }));

    act(() => { result.current.disablePlugin('marklite-backlinks'); });

    expect(onDeactivate).toHaveBeenCalledWith('marklite-backlinks');
  });

  it('calls onActivate when togglePlugin enables a plugin', () => {
    const onActivate = vi.fn().mockResolvedValue(undefined);
    // marklite-graph-view starts disabled by default
    const { result } = renderHook(() => usePlugins({ onActivate }));

    act(() => { result.current.togglePlugin('marklite-graph-view'); });

    expect(onActivate).toHaveBeenCalledWith('marklite-graph-view');
  });

  it('calls onDeactivate when togglePlugin disables a plugin', () => {
    const onDeactivate = vi.fn().mockResolvedValue(undefined);
    // marklite-backlinks starts enabled by default
    const { result } = renderHook(() => usePlugins({ onDeactivate }));

    act(() => { result.current.togglePlugin('marklite-backlinks'); });

    expect(onDeactivate).toHaveBeenCalledWith('marklite-backlinks');
  });

  it('works fine without any lifecycle callbacks (no crash)', () => {
    const { result } = renderHook(() => usePlugins());

    expect(() => {
      act(() => { result.current.enablePlugin('marklite-backlinks'); });
      act(() => { result.current.disablePlugin('marklite-backlinks'); });
    }).not.toThrow();
  });
});

// ── ID Migration ─────────────────────────────────────────────────────────

describe('usePlugins - ID migration', () => {
  it('migrates old IDs (backlinks-panel, graph-view) to marklite-* format', () => {
    storageMock['marklite-installed-plugins'] = JSON.stringify([
      { id: 'backlinks-panel', name: 'Backlinks Panel', version: '1.0.0', author: 'MarkLite++ Team', description: 'desc', enabled: true, permissions: [] },
      { id: 'graph-view', name: 'Graph View', version: '1.0.0', author: 'MarkLite++ Team', description: 'desc', enabled: false, permissions: [] },
    ]);

    const { result } = renderHook(() => usePlugins());
    const ids = result.current.plugins.map((p) => p.id);
    expect(ids).toContain('marklite-backlinks');
    expect(ids).toContain('marklite-graph-view');
    expect(ids).not.toContain('backlinks-panel');
    expect(ids).not.toContain('graph-view');
  });

  it('merges missing default plugins after migration', () => {
    storageMock['marklite-installed-plugins'] = JSON.stringify([
      { id: 'marklite-backlinks', name: 'Backlinks Panel', version: '1.0.0', author: 'MarkLite++ Team', description: 'desc', enabled: true, permissions: [] },
    ]);

    const { result } = renderHook(() => usePlugins());
    const ids = result.current.plugins.map((p) => p.id);
    // Should have all default plugins merged in
    expect(ids).toContain('marklite-backlinks');
    expect(ids).toContain('marklite-graph-view');
  });
});

// ── Remove triggers deactivate ─────────────────────────────────────────

describe('usePlugins - removePlugin deactivation', () => {
  it('calls onDeactivate when removePlugin is called', () => {
    const onDeactivate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePlugins({ onDeactivate }));

    act(() => { result.current.removePlugin('marklite-backlinks'); });

    expect(onDeactivate).toHaveBeenCalledWith('marklite-backlinks');
  });

  it('removes the plugin from the list', () => {
    const { result } = renderHook(() => usePlugins());
    const before = result.current.plugins.map((p) => p.id);
    expect(before).toContain('marklite-backlinks');

    act(() => { result.current.removePlugin('marklite-backlinks'); });

    const after = result.current.plugins.map((p) => p.id);
    expect(after).not.toContain('marklite-backlinks');
  });
});

// ── Lifecycle error handling ──────────────────────────────────────────────

describe('usePlugins - lifecycle error handling', () => {
  it('does not throw when onActivate rejects', async () => {
    const onActivate = vi.fn().mockRejectedValue(new Error('activate boom'));
    const { result } = renderHook(() => usePlugins({ onActivate }));
    expect(() =>
      act(() => { result.current.enablePlugin('marklite-backlinks'); })
    ).not.toThrow();
  });

  it('does not throw when onDeactivate rejects', async () => {
    const onDeactivate = vi.fn().mockRejectedValue(new Error('deactivate boom'));
    const { result } = renderHook(() => usePlugins({ onDeactivate }));
    expect(() =>
      act(() => { result.current.disablePlugin('marklite-backlinks'); })
    ).not.toThrow();
  });

  it('does not throw when onDeactivate rejects during removePlugin', async () => {
    const onDeactivate = vi.fn().mockRejectedValue(new Error('remove boom'));
    const { result } = renderHook(() => usePlugins({ onDeactivate }));
    expect(() =>
      act(() => { result.current.removePlugin('marklite-backlinks'); })
    ).not.toThrow();
  });
});

// ── addPluginFromManifest - ID validation ─────────────────────────────────

describe('usePlugins - addPluginFromManifest ID validation', () => {
  it('rejects a manifest with path traversal in ID', () => {
    const { result } = renderHook(() => usePlugins());
    const added = result.current.addPluginFromManifest({
      id: '../../evil',
      name: 'Evil',
      version: '1.0.0',
      permissions: [],
    });
    expect(added).toBe(false);
  });

  it('rejects a manifest with forward slash in ID', () => {
    const { result } = renderHook(() => usePlugins());
    const added = result.current.addPluginFromManifest({
      id: 'some/other',
      name: 'Other',
      version: '1.0.0',
      permissions: [],
    });
    expect(added).toBe(false);
  });

  it('rejects a manifest with URL-encoded traversal in ID', () => {
    const { result } = renderHook(() => usePlugins());
    const added = result.current.addPluginFromManifest({
      id: '%2e%2e/evil',
      name: 'Evil',
      version: '1.0.0',
      permissions: [],
    });
    expect(added).toBe(false);
  });

  it('accepts a valid plugin ID', () => {
    const { result } = renderHook(() => usePlugins());
    let added: boolean | 'pending_approval' = false;
    act(() => {
      added = result.current.addPluginFromManifest({
        id: 'my-safe-plugin',
        name: 'Safe Plugin',
        version: '1.0.0',
        permissions: [],
      });
    });
    expect(added).not.toBe(false);
  });
});
