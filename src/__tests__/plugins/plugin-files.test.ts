import { createPluginContext, type PluginContextDeps } from '../../plugins/plugin-context-factory';
import { createSandboxedContext } from '../../plugins/plugin-sandbox';

function makeDeps(overrides?: Partial<PluginContextDeps>): PluginContextDeps {
  return {
    getActiveTab: () => ({ path: '/test.md', content: 'hello' }),
    openFileInTab: () => {},
    getOpenFilePaths: () => ['/test.md'],
    registerSidebarPanel: () => {},
    unregisterSidebarPanel: () => {},
    addStatusBarItem: () => {},
    removeStatusBarItem: () => {},
    registerPreviewRenderer: () => {},
    unregisterPreviewRenderer: () => {},
    ...overrides,
  };
}

describe('files.watch', () => {
  it('should return a Disposable', () => {
    const deps = makeDeps({
      watchFiles: (pattern, cb) => {
        cb('/test/file.md');
        return () => {};
      },
    });
    const ctx = createPluginContext(deps);
    const disposable = ctx.files.watch('**/*.md', () => {});
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
    disposable.dispose();
  });

  it('should stop triggering callback after dispose', () => {
    let callCount = 0;
    const triggerCb: Array<() => void> = [];
    const deps = makeDeps({
      watchFiles: (_pattern, cb) => {
        triggerCb.push(() => cb('/test/file.md'));
        return () => {
          // simulate disposal — clear callbacks
          triggerCb.length = 0;
        };
      },
    });
    const ctx = createPluginContext(deps);
    const disposable = ctx.files.watch('**/*.md', () => { callCount++; });

    // Before dispose, callback works
    triggerCb.forEach(fn => fn());
    expect(callCount).toBe(1);

    disposable.dispose();

    // After dispose, no more triggers (callbacks cleared)
    triggerCb.push(() => callCount++);
    triggerCb.forEach(fn => fn());
    // The internal subscription was disposed; new pushes to triggerCb don't matter
    // because the watcher no longer calls the callback
    expect(callCount).toBe(1);
  });

  it('should match files by glob pattern', () => {
    const watchedPatterns: string[] = [];
    const deps = makeDeps({
      watchFiles: (pattern, _cb) => {
        watchedPatterns.push(pattern);
        return () => {};
      },
    });
    const ctx = createPluginContext(deps);
    ctx.files.watch('**/*.md', () => {});
    expect(watchedPatterns).toEqual(['**/*.md']);
  });

  it('should throw PluginPermissionError when no file.watch permission', () => {
    const deps = makeDeps();
    const ctx = createPluginContext(deps);
    const sandboxed = createSandboxedContext(ctx, {
      permissions: [], // no file.watch
      pluginId: 'test-plugin',
    });

    expect(() => sandboxed.files.watch('**/*.md', () => {})).toThrow(
      expect.objectContaining({ name: 'PluginPermissionError' }),
    );
  });

  it('should not throw when file.watch permission is granted', () => {
    const deps = makeDeps({
      watchFiles: () => () => {},
    });
    const ctx = createPluginContext(deps);
    const sandboxed = createSandboxedContext(ctx, {
      permissions: ['file.watch'],
      pluginId: 'test-plugin',
    });

    expect(() => sandboxed.files.watch('**/*.md', () => {})).not.toThrow();
  });
});
