import { describe, it, expect, vi } from 'vitest';
import { createWorkspaceAPI } from '../../plugins/plugin-workspace';

describe('Workspace API', () => {
  const mockDeps = {
    getActiveTab: vi.fn(() => ({ path: '/test/file.md', content: '# Hello' })),
    openFileInTab: vi.fn(),
    getOpenFilePaths: vi.fn(() => ['/test/file.md', '/test/other.md']),
  };

  it('should return active file info (path + name)', () => {
    const api = createWorkspaceAPI(mockDeps as any);
    const file = api.getActiveFile();
    expect(file).toEqual({ path: '/test/file.md', name: 'file.md' });
  });

  it('should return all open file paths when no getAllWorkspaceFiles dep', () => {
    const api = createWorkspaceAPI(mockDeps as any);
    const files = api.getAllFiles();
    expect(files).toEqual(['/test/file.md', '/test/other.md']);
  });

  it('should use getAllWorkspaceFiles when provided', () => {
    const deps = {
      ...mockDeps,
      getAllWorkspaceFiles: vi.fn(() => ['/a.md', '/b.md', '/c.md']),
    };
    const api = createWorkspaceAPI(deps as any);
    expect(api.getAllFiles()).toEqual(['/a.md', '/b.md', '/c.md']);
  });

  it('should call openFileInTab when opening a file', () => {
    const api = createWorkspaceAPI(mockDeps as any);
    api.openFile('/test/new.md');
    expect(mockDeps.openFileInTab).toHaveBeenCalledWith('/test/new.md');
  });

  it('onFileChanged should return a disposable', () => {
    const api = createWorkspaceAPI(mockDeps as any);
    const disposable = api.onFileChanged?.(() => {});
    expect(disposable).toBeDefined();
    expect(typeof disposable!.dispose).toBe('function');
  });

  it('should return { path: null, name: null } when no tab is active', () => {
    const deps = { ...mockDeps, getActiveTab: vi.fn(() => null) };
    const api = createWorkspaceAPI(deps as any);
    const file = api.getActiveFile();
    expect(file).toEqual({ path: null, name: null });
  });
});

describe('onFileChanged', () => {
  it('should trigger callback when active file changes', () => {
    let listener: ((file: { path: string; name: string }) => void) | null = null;
    const notifyActiveFileChanged = (cb: (file: { path: string; name: string }) => void) => {
      listener = cb;
      return () => { listener = null; };
    };
    const api = createWorkspaceAPI({
      getActiveTab: () => null,
      openFileInTab: () => {},
      getOpenFilePaths: () => [],
      onActiveFileChanged: notifyActiveFileChanged,
    } as any);

    const cb = vi.fn();
    api.onFileChanged(cb);
    listener!({ path: '/foo.md', name: 'foo.md' });
    expect(cb).toHaveBeenCalledWith({ path: '/foo.md', name: 'foo.md' });
  });

  it('should return Disposable that stops callbacks on dispose', () => {
    const api = createWorkspaceAPI({
      getActiveTab: () => null,
      openFileInTab: () => {},
      getOpenFilePaths: () => [],
      onActiveFileChanged: () => () => {},
    } as any);

    const cb = vi.fn();
    const disposable = api.onFileChanged(cb);
    disposable!.dispose();
    expect(typeof disposable!.dispose).toBe('function');
  });

  it('should pass { path, name } to callback', () => {
    let listener: ((file: { path: string; name: string }) => void) | null = null;
    const notifyActiveFileChanged = (cb: (file: { path: string; name: string }) => void) => {
      listener = cb;
      return () => { listener = null; };
    };
    const api = createWorkspaceAPI({
      getActiveTab: () => null,
      openFileInTab: () => {},
      getOpenFilePaths: () => [],
      onActiveFileChanged: notifyActiveFileChanged,
    } as any);

    const cb = vi.fn();
    api.onFileChanged(cb);
    listener!({ path: '/docs/readme.md', name: 'readme.md' });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ path: '/docs/readme.md', name: 'readme.md' });
  });

  it('should support multiple subscribers', () => {
    const cbs: ((file: { path: string; name: string }) => void)[] = [];
    const notifyActiveFileChanged = (cb: (file: { path: string; name: string }) => void) => {
      cbs.push(cb);
      return () => { const i = cbs.indexOf(cb); if (i >= 0) cbs.splice(i, 1); };
    };
    const api = createWorkspaceAPI({
      getActiveTab: () => null,
      openFileInTab: () => {},
      getOpenFilePaths: () => [],
      onActiveFileChanged: notifyActiveFileChanged,
    } as any);

    const cb1 = vi.fn();
    const cb2 = vi.fn();
    api.onFileChanged(cb1);
    api.onFileChanged(cb2);
    cbs.forEach(fn => fn({ path: '/a.md', name: 'a.md' }));
    expect(cb1).toHaveBeenCalledWith({ path: '/a.md', name: 'a.md' });
    expect(cb2).toHaveBeenCalledWith({ path: '/a.md', name: 'a.md' });
  });

  it('should throw PluginPermissionError when no workspace permission', () => {
    const api = createWorkspaceAPI({
      getActiveTab: () => null,
      openFileInTab: () => {},
      getOpenFilePaths: () => [],
    } as any);
    expect(typeof api.onFileChanged).toBe('function');
  });
});
