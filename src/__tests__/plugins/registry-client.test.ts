import { describe, it, expect } from 'vitest';
import { getOfficialRegistry, getOfficialPlugins, findPluginById } from '../../plugins/registry/registry-client';

describe('registry-client', () => {
  it('getOfficialRegistry returns manifest with correct structure', () => {
    const reg = getOfficialRegistry();
    expect(reg).toHaveProperty('version');
    expect(reg).toHaveProperty('updatedAt');
    expect(Array.isArray(reg.plugins)).toBe(true);
    expect(reg.plugins.length).toBeGreaterThan(0);
  });

  it('getOfficialPlugins returns array of plugins', () => {
    const plugins = getOfficialPlugins();
    expect(plugins.length).toBeGreaterThan(0);
    for (const p of plugins) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.version).toBeTruthy();
      expect(p.manifestUrl).toBeTruthy();
    }
  });

  it('findPluginById returns plugin when found', () => {
    const plugin = findPluginById('marklite-backlinks');
    expect(plugin).toBeDefined();
    expect(plugin!.name).toBe('Backlinks Panel');
  });

  it('findPluginById returns undefined for unknown id', () => {
    const plugin = findPluginById('nonexistent-plugin-xyz');
    expect(plugin).toBeUndefined();
  });

  it('findPluginById returns undefined for empty string', () => {
    expect(findPluginById('')).toBeUndefined();
  });

  it('all plugins have required fields', () => {
    const plugins = getOfficialPlugins();
    for (const p of plugins) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(typeof p.version).toBe('string');
      expect(typeof p.author).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(Array.isArray(p.tags)).toBe(true);
    }
  });
});
