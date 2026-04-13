import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'marklite-installed-plugins';
let storageMock: Record<string, string> = {};

beforeEach(() => {
  storageMock = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => {
      storageMock[key] = value;
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    },
  });
});

import { PluginStorage } from '../../plugins/plugin-storage';
import type { InstalledPluginRecord, PluginManifest } from '../../plugins/types';

const makeRecord = (id: string, overrides?: Partial<InstalledPluginRecord>): InstalledPluginRecord => {
  const manifest: PluginManifest = {
    id,
    name: `Test ${id}`,
    version: '1.0.0',
    description: 'test',
    author: 'test',
    main: 'dist/index.js',
    activationEvents: ['onStartup'],
    permissions: ['storage'],
  };
  return {
    id,
    manifest,
    enabled: true,
    grantedPermissions: ['storage'],
    installedAt: Date.now(),
    ...overrides,
  };
};

describe('PluginStorage', () => {
  it('returns empty array when nothing stored', () => {
    const s = new PluginStorage();
    expect(s.getInstalledPlugins()).toEqual([]);
  });

  it('adds and retrieves a plugin', () => {
    const s = new PluginStorage();
    const record = makeRecord('test-plugin');
    s.addPlugin(record);
    expect(s.getInstalledPlugins()).toHaveLength(1);
    expect(s.getInstalledPlugins()[0].id).toBe('test-plugin');
  });

  it('updates existing plugin on duplicate add', () => {
    const s = new PluginStorage();
    const record = makeRecord('test-plugin');
    s.addPlugin(record);
    s.addPlugin({ ...record, enabled: false });
    expect(s.getInstalledPlugins()).toHaveLength(1);
    expect(s.getInstalledPlugins()[0].enabled).toBe(false);
  });

  it('removes a plugin', () => {
    const s = new PluginStorage();
    s.addPlugin(makeRecord('a'));
    s.addPlugin(makeRecord('b'));
    s.removePlugin('a');
    expect(s.getInstalledPlugins()).toHaveLength(1);
    expect(s.getInstalledPlugins()[0].id).toBe('b');
  });

  it('updates a plugin partially', () => {
    const s = new PluginStorage();
    s.addPlugin(makeRecord('test-plugin'));
    s.updatePlugin('test-plugin', { enabled: false });
    expect(s.getInstalledPlugins()[0].enabled).toBe(false);
  });

  it('ignores update for non-existent plugin', () => {
    const s = new PluginStorage();
    expect(() => s.updatePlugin('nope', { enabled: false })).not.toThrow();
  });

  it('persists data round-trip', () => {
    const s = new PluginStorage();
    s.addPlugin(makeRecord('p1'));
    s.addPlugin(makeRecord('p2'));

    // Simulate new storage instance
    const s2 = new PluginStorage();
    expect(s2.getInstalledPlugins()).toHaveLength(2);
  });
});
