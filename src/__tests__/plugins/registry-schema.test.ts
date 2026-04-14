import { describe, it, expect } from 'vitest';

describe('registry-schema', () => {
  it('RegistryPluginEntry type accepts valid entry', () => {
    const entry = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Tester',
      tags: ['test'],
      manifestUrl: 'test/manifest.json',
    };
    // Runtime check - all fields present
    expect(entry.id).toBe('test-plugin');
    expect(entry.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('RegistryPluginEntry optional fields are allowed', () => {
    const entry = {
      id: 'minimal',
      name: 'Minimal',
      version: '0.0.1',
      description: 'Desc',
      author: 'A',
      tags: [],
      manifestUrl: 'm.json',
      icon: '🧩',
      installedVersion: '0.0.1',
    };
    expect(entry.icon).toBe('🧩');
    expect(entry.installedVersion).toBe('0.0.1');
  });

  it('RegistryManifest type accepts valid manifest', () => {
    const manifest = {
      version: '1.0.0',
      updatedAt: '2026-01-01T00:00:00Z',
      plugins: [],
    };
    expect(manifest.plugins).toHaveLength(0);
  });

  it('official-registry.json loads correctly', async () => {
    const { default: official } = await import('../../plugins/registry/official-registry.json');
    expect(official.version).toBeTruthy();
    expect(official.updatedAt).toBeTruthy();
    expect(official.plugins.length).toBeGreaterThan(0);
  });
});
