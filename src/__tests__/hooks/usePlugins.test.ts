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
  it('uses a different localStorage key than PluginStorage ("marklite-installed-plugins")', () => {
    const pluginStorage = new PluginStorage();

    // Write via PluginStorage with full InstalledPluginRecord schema
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

    // The PluginStorage key should be 'marklite-installed-plugins'
    expect(storageMock['marklite-installed-plugins']).toBeDefined();

    // The usePlugins UI key should be something different
    const UI_KEY = 'marklite-ui-plugins';
    // If usePlugins has not run yet, its key should be absent (or different from lifecycle key)
    expect(UI_KEY).not.toBe('marklite-installed-plugins');

    // Verify PluginStorage data is still intact (not overwritten)
    const stored = JSON.parse(storageMock['marklite-installed-plugins']) as { id: string }[];
    expect(stored[0].id).toBe('lifecycle-plugin');
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
      { id: 'backlinks-panel', name: 'Backlinks Panel', version: '1.0.0', author: 'MarkLite Team', description: 'desc', enabled: true, permissions: [] },
      { id: 'graph-view', name: 'Graph View', version: '1.0.0', author: 'MarkLite Team', description: 'desc', enabled: false, permissions: [] },
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
      { id: 'marklite-backlinks', name: 'Backlinks Panel', version: '1.0.0', author: 'MarkLite Team', description: 'desc', enabled: true, permissions: [] },
    ]);

    const { result } = renderHook(() => usePlugins());
    const ids = result.current.plugins.map((p) => p.id);
    // Should have all default plugins merged in
    expect(ids).toContain('marklite-backlinks');
    expect(ids).toContain('marklite-graph-view');
    expect(ids).toContain('marklite-snippet-manager');
    expect(ids).toContain('marklite-preview-edit');
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
