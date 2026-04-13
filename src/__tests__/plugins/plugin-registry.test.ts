import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../../plugins/plugin-registry';
import type { PluginManifest, PluginPermission } from '../../plugins/types';

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

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  const perms: PluginPermission[] = ['storage'];

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('registers a plugin and returns instance', () => {
    const inst = registry.register(makeManifest('a'), perms);
    expect(inst.manifest.id).toBe('a');
    expect(inst.status).toBe('installed');
  });

  it('gets a plugin by id', () => {
    registry.register(makeManifest('a'), perms);
    expect(registry.get('a')?.manifest.id).toBe('a');
    expect(registry.get('b')).toBeUndefined();
  });

  it('unregisters a plugin', () => {
    registry.register(makeManifest('a'), perms);
    registry.unregister('a');
    expect(registry.get('a')).toBeUndefined();
  });

  it('getAll returns all plugins', () => {
    registry.register(makeManifest('a'), perms);
    registry.register(makeManifest('b'), perms);
    expect(registry.getAll()).toHaveLength(2);
  });

  it('getActive returns only active plugins', () => {
    const inst = registry.register(makeManifest('a'), perms);
    inst.status = 'active';
    registry.register(makeManifest('b'), perms);
    expect(registry.getActive()).toHaveLength(1);
    expect(registry.getActive()[0].manifest.id).toBe('a');
  });

  it('getByActivation filters by event', () => {
    registry.register(
      { ...makeManifest('a'), activationEvents: ['onStartup'] },
      perms,
    );
    registry.register(
      { ...makeManifest('b'), activationEvents: ['onFileOpen'] },
      perms,
    );
    expect(registry.getByActivation('onStartup')).toHaveLength(1);
    expect(registry.getByActivation('onFileOpen')).toHaveLength(1);
  });
});
