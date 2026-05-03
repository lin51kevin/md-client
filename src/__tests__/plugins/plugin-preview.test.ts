import { describe, it, expect, vi } from 'vitest';
import { createPreviewAPI } from '../../plugins/plugin-preview';

function createMockDeps() {
  return {
    registerPreviewRenderer: vi.fn(),
    unregisterPreviewRenderer: vi.fn(),
    registerPreviewRemarkPlugin: vi.fn(() => ({ dispose: vi.fn() })),
    unregisterPreviewRemarkPlugin: vi.fn(),
  };
}

describe('plugin-preview', () => {
  it('registers a renderer and calls deps callback', () => {
    const deps = createMockDeps();
    const api = createPreviewAPI(deps);

    const renderFn = vi.fn();
    api.registerRenderer('blockquote', renderFn);

    expect(deps.registerPreviewRenderer).toHaveBeenCalledWith(
      'blockquote',
      renderFn,
    );
  });

  it('returns a disposable that unregisters on dispose', () => {
    const deps = createMockDeps();
    const api = createPreviewAPI(deps);

    const renderFn = vi.fn();
    const disposable = api.registerRenderer('p', renderFn);

    disposable.dispose();

    expect(deps.unregisterPreviewRenderer).toHaveBeenCalledWith('p');
  });

  it('tracks multiple registrations independently', () => {
    const deps = createMockDeps();
    const api = createPreviewAPI(deps);

    const render1 = vi.fn();
    const render2 = vi.fn();
    const d1 = api.registerRenderer('p', render1);
    const d2 = api.registerRenderer('h1', render2);

    expect(deps.registerPreviewRenderer).toHaveBeenCalledTimes(2);

    d1.dispose();
    expect(deps.unregisterPreviewRenderer).toHaveBeenCalledWith('p');
    expect(deps.unregisterPreviewRenderer).toHaveBeenCalledTimes(1);

    d2.dispose();
    expect(deps.unregisterPreviewRenderer).toHaveBeenCalledWith('h1');
    expect(deps.unregisterPreviewRenderer).toHaveBeenCalledTimes(2);
  });

  it('dispose is idempotent — second call is a no-op', () => {
    const deps = createMockDeps();
    const api = createPreviewAPI(deps);

    const disposable = api.registerRenderer('blockquote', vi.fn());
    disposable.dispose();
    disposable.dispose();

    expect(deps.unregisterPreviewRenderer).toHaveBeenCalledTimes(1);
  });

  it('overwrites same nodeType with latest renderFn (same plugin)', () => {
    const deps = createMockDeps();
    const api = createPreviewAPI(deps);

    const render1 = vi.fn();
    const render2 = vi.fn();
    api.registerRenderer('blockquote', render1);
    api.registerRenderer('blockquote', render2);

    // Both calls forwarded to deps
    expect(deps.registerPreviewRenderer).toHaveBeenCalledTimes(2);
    expect(deps.registerPreviewRenderer).toHaveBeenLastCalledWith('blockquote', render2);
  });

  describe('registerRemarkPlugin', () => {
    it('should register a remark plugin and return Disposable', () => {
      const deps = createMockDeps();
      const api = createPreviewAPI(deps);
      const plugin = () => {};

      const disposable = api.registerRemarkPlugin(plugin);

      expect(deps.registerPreviewRemarkPlugin).toHaveBeenCalledWith(plugin);
      expect(disposable).toHaveProperty('dispose');
      expect(typeof disposable.dispose).toBe('function');
    });

    it('should remove plugin on dispose', () => {
      const deps = createMockDeps();
      const api = createPreviewAPI(deps);
      const plugin = () => {};

      const disposable = api.registerRemarkPlugin(plugin);
      disposable.dispose();

      expect(deps.unregisterPreviewRemarkPlugin).toHaveBeenCalledWith(plugin);
    });

    it('should be idempotent on dispose', () => {
      const deps = createMockDeps();
      const api = createPreviewAPI(deps);
      const plugin = () => {};

      const disposable = api.registerRemarkPlugin(plugin);
      disposable.dispose();
      disposable.dispose();

      expect(deps.unregisterPreviewRemarkPlugin).toHaveBeenCalledTimes(1);
    });

    it('should throw when remark plugin registration is not supported', () => {
      const deps = createMockDeps();
      deps.registerPreviewRemarkPlugin = undefined;
      const api = createPreviewAPI(deps);

      expect(() => api.registerRemarkPlugin(() => {})).toThrow(
        'Remark plugin registration is not supported in this environment',
      );
    });

    it('should work alongside existing registerRenderer', () => {
      const deps = createMockDeps();
      const api = createPreviewAPI(deps);

      api.registerRenderer('p', vi.fn());
      api.registerRemarkPlugin(() => {});

      expect(deps.registerPreviewRenderer).toHaveBeenCalledTimes(1);
      expect(deps.registerPreviewRemarkPlugin).toHaveBeenCalledTimes(1);
    });
  });
});
