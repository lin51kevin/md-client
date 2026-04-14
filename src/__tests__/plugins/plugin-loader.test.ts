import { describe, it, expect } from 'vitest';
import { validateManifest, checkEngineVersion, loadPluginModule } from '../../plugins/plugin-loader';

describe('validateManifest', () => {
  const validManifest = {
    id: 'test-plugin',
    name: 'Test',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Tester',
    main: 'dist/index.js',
    activationEvents: ['onStartup'],
    permissions: ['storage'],
  };

  it('validates a correct manifest', () => {
    const result = validateManifest(validManifest);
    expect(result.id).toBe('test-plugin');
  });

  it('throws on null', () => {
    expect(() => validateManifest(null)).toThrow('expected an object');
  });

  it('throws on missing required field', () => {
    expect(() => validateManifest({ ...validManifest, id: undefined })).toThrow('"id"');
  });

  it('throws when activationEvents is not an array', () => {
    expect(() =>
      validateManifest({ ...validManifest, activationEvents: 'bad' }),
    ).toThrow('activationEvents must be an array');
  });

  it('throws when permissions is not an array', () => {
    expect(() =>
      validateManifest({ ...validManifest, permissions: 'bad' }),
    ).toThrow('permissions must be an array');
  });
});

describe('loadPluginModule - path sanitization', () => {
  const makeManifest = (overrides: Partial<{ id: string; main: string }>) => ({
    id: 'safe-plugin',
    name: 'Safe',
    version: '1.0.0',
    description: 'desc',
    author: 'a',
    main: 'dist/index.js',
    activationEvents: [],
    permissions: [],
    ...overrides,
  });

  it('rejects id with directory traversal (../)', async () => {
    const manifest = makeManifest({ id: '../../evil' }) as ReturnType<typeof import('../../plugins/plugin-loader').validateManifest>;
    await expect(loadPluginModule(manifest)).rejects.toThrow(/traversal|invalid/i);
  });

  it('rejects id with forward slash', async () => {
    const manifest = makeManifest({ id: 'some/other' }) as any;
    await expect(loadPluginModule(manifest)).rejects.toThrow(/traversal|invalid/i);
  });

  it('rejects main with directory traversal (../../)', async () => {
    const manifest = makeManifest({ main: '../../etc/passwd' }) as any;
    await expect(loadPluginModule(manifest)).rejects.toThrow(/traversal|invalid/i);
  });

  it('rejects main starting with absolute path (/)', async () => {
    const manifest = makeManifest({ main: '/abs/path.js' }) as any;
    await expect(loadPluginModule(manifest)).rejects.toThrow(/traversal|invalid/i);
  });

  it('rejects URL-encoded traversal (%2e%2e) in id', async () => {
    const manifest = makeManifest({ id: '%2e%2e/evil' }) as any;
    await expect(loadPluginModule(manifest)).rejects.toThrow(/traversal|invalid/i);
  });

  it('rejects URL-encoded slash (%2f) in id', async () => {
    const manifest = makeManifest({ id: 'a%2fb' }) as any;
    await expect(loadPluginModule(manifest)).rejects.toThrow(/traversal|invalid/i);
  });

  it('accepts safe id and main (import may fail but no security throw)', async () => {
    const manifest = makeManifest({ id: 'my-plugin', main: 'dist/index.js' }) as any;
    // Should not throw a security error; the import itself may fail, but returns {}
    const result = await loadPluginModule(manifest);
    expect(result).toBeDefined();
  });
});

describe('checkEngineVersion', () => {
  it('returns true when no engines.marklite', () => {
    expect(checkEngineVersion({ ...validateManifest({ id: 'x', name: 'X', version: '1.0.0', description: 'd', author: 'a', main: 'm', activationEvents: [], permissions: [] }) })).toBe(true);
  });

  it('returns true when version satisfies', () => {
    const manifest = validateManifest({
      id: 'x', name: 'X', version: '1.0.0', description: 'd', author: 'a', main: 'm',
      activationEvents: [], permissions: [],
      engines: { marklite: '0.7.0' },
    });
    expect(checkEngineVersion(manifest)).toBe(true);
  });

  it('returns false when version too low', () => {
    const manifest = validateManifest({
      id: 'x', name: 'X', version: '1.0.0', description: 'd', author: 'a', main: 'm',
      activationEvents: [], permissions: [],
      engines: { marklite: '99.0.0' },
    });
    expect(checkEngineVersion(manifest)).toBe(false);
  });
});
