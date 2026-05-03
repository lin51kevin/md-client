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

describe('files.readFile', () => {
  it('should return file content when file exists', async () => {
    const deps = makeDeps({
      readFileContent: async (path: string) => {
        if (path === '/test/file.md') return '# Hello';
        return null;
      },
    });
    const ctx = createPluginContext(deps);
    const result = await ctx.files.readFile('/test/file.md');
    expect(result).toBe('# Hello');
  });

  it('should return null when file does not exist', async () => {
    const deps = makeDeps({
      readFileContent: async () => null,
    });
    const ctx = createPluginContext(deps);
    const result = await ctx.files.readFile('/nonexistent.md');
    expect(result).toBeNull();
  });

  it('should throw PluginPermissionError when no file.read permission', async () => {
    const deps = makeDeps({
      readFileContent: async () => 'content',
    });
    const ctx = createPluginContext(deps);
    const sandboxed = createSandboxedContext(ctx, {
      permissions: [], // no file.read
      pluginId: 'test-plugin',
    });

    await expect(sandboxed.files.readFile('/test.md')).rejects.toThrow(
      expect.objectContaining({ name: 'PluginPermissionError' }),
    );
  });

  it('should forward absolute path correctly', async () => {
    const capturedPaths: string[] = [];
    const deps = makeDeps({
      readFileContent: async (path: string) => {
        capturedPaths.push(path);
        return `content of ${path}`;
      },
    });
    const ctx = createPluginContext(deps);
    await ctx.files.readFile('/absolute/path/file.md');
    expect(capturedPaths).toEqual(['/absolute/path/file.md']);
  });

  it('should resolve relative path against active file directory', async () => {
    const capturedPaths: string[] = [];
    const deps = makeDeps({
      getActiveTab: () => ({ path: '/workspace/docs/test.md', content: '' }),
      readFileContent: async (path: string) => {
        capturedPaths.push(path);
        return 'resolved';
      },
    });
    const ctx = createPluginContext(deps);
    await ctx.files.readFile('../images/logo.png');
    expect(capturedPaths).toEqual(['/workspace/docs/../images/logo.png']);
  });

  it('should return null when readFileContent dep is not provided', async () => {
    const deps = makeDeps(); // no readFileContent
    const ctx = createPluginContext(deps);
    const result = await ctx.files.readFile('/test.md');
    expect(result).toBeNull();
  });
});

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
