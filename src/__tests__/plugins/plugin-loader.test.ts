import { describe, it, expect } from 'vitest';
import { validateManifest, checkEngineVersion } from '../../plugins/plugin-loader';

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
