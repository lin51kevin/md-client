import { describe, it, expect, beforeEach, vi } from 'vitest';

let storageMock: Record<string, string> = {};
beforeEach(() => {
  storageMock = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => { storageMock[key] = value; },
    removeItem: (key: string) => { delete storageMock[key]; },
  });
});

import { PluginRegistry } from '../../plugins/plugin-registry';
import { PluginStorage } from '../../plugins/plugin-storage';
import { PluginLifecycle } from '../../plugins/plugin-lifecycle';
import type { PluginManifest } from '../../plugins/types';

const makeManifest = (id: string): PluginManifest => ({
  id,
  name: `Test ${id}`,
  version: '1.0.0',
  description: 'test',
  author: 'test',
  main: 'dist/index.js',
  activationEvents: ['onStartup'],
  permissions: ['storage'],
});

describe('PluginLifecycle', () => {
  let registry: PluginRegistry;
  let storage: PluginStorage;
  let lifecycle: PluginLifecycle;

  beforeEach(() => {
    registry = new PluginRegistry();
    storage = new PluginStorage();
    lifecycle = new PluginLifecycle(registry, storage);
  });

  it('activates a plugin', async () => {
    const activateFn = vi.fn().mockResolvedValue(undefined);
    const inst = registry.register(makeManifest('a'), ['storage']);
    inst.activate = activateFn;

    await lifecycle.activate('a');
    expect(activateFn).toHaveBeenCalled();
    expect(inst.status).toBe('active');
  });

  it('sets error status on activation failure', async () => {
    const activateFn = vi.fn().mockRejectedValue(new Error('boom'));
    const inst = registry.register(makeManifest('a'), ['storage']);
    inst.activate = activateFn;

    await lifecycle.activate('a');
    expect(inst.status).toBe('error');
  });

  it('warns on activating unknown plugin', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await lifecycle.activate('nonexistent');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('deactivates a plugin', async () => {
    const deactivateFn = vi.fn().mockResolvedValue(undefined);
    const inst = registry.register(makeManifest('a'), ['storage']);
    inst.status = 'active';
    inst.deactivate = deactivateFn;

    await lifecycle.deactivate('a');
    expect(deactivateFn).toHaveBeenCalled();
    expect(inst.status).toBe('disabled');
  });

  it('activateByEvent activates matching plugins', async () => {
    const activateFn = vi.fn().mockResolvedValue(undefined);
    registry.register(
      { ...makeManifest('a'), activationEvents: ['onStartup'] },
      ['storage'],
    );
    registry.register(
      { ...makeManifest('b'), activationEvents: ['onFileOpen'] },
      ['storage'],
    );
    // Manually set activate
    registry.get('a')!.activate = activateFn;

    await lifecycle.activateByEvent('onStartup');
    expect(activateFn).toHaveBeenCalledTimes(1);
  });

  it('activateAll activates all enabled plugins from storage', async () => {
    const activateFn = vi.fn().mockResolvedValue(undefined);

    // Pre-register and set activate
    const inst = registry.register(makeManifest('a'), ['storage']);
    inst.activate = activateFn;

    // Save to storage as enabled
    storage.addPlugin({
      id: 'a',
      manifest: makeManifest('a'),
      enabled: true,
      grantedPermissions: ['storage'],
      installedAt: Date.now(),
    });

    await lifecycle.activateAll();
    expect(activateFn).toHaveBeenCalledTimes(1);
  });
});
