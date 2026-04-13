import { describe, it, expect, vi } from 'vitest';
import { createWorkspaceAPI } from '../../plugins/plugin-workspace';

describe('Workspace API', () => {
  const mockDeps = {
    getActiveTab: vi.fn(() => ({ path: '/test/file.md', content: '# Hello' })),
    openFileInTab: vi.fn(),
    getOpenFilePaths: vi.fn(() => ['/test/file.md', '/test/other.md']),
  };

  it('should return active file info', () => {
    const api = createWorkspaceAPI(mockDeps as any);
    const file = api.getActiveFile();
    expect(file).toEqual({ path: '/test/file.md', content: '# Hello' });
  });

  it('should return all open file paths', () => {
    const api = createWorkspaceAPI(mockDeps as any);
    const files = api.getAllFiles();
    expect(files).toEqual(['/test/file.md', '/test/other.md']);
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

  it('should return null active file when no tab is active', () => {
    const deps = { ...mockDeps, getActiveTab: vi.fn(() => null) };
    const api = createWorkspaceAPI(deps as any);
    const file = api.getActiveFile();
    expect(file).toBeNull();
  });
});
