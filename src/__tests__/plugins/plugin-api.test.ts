import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginAPI, createPluginAPI } from '../../plugins/plugin-api';

describe('PluginAPI', () => {
  let api: PluginAPI;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    api = createPluginAPI();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('getFileContent returns null and warns', async () => {
    const result = await api.getFileContent('/test.md');
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('writeFile warns', async () => {
    await api.writeFile('/test.md', 'hello');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('showStatusBarItem returns a disposable', () => {
    const d = api.showStatusBarItem('id', 'text');
    expect(typeof d.dispose).toBe('function');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('showSidebarPanel returns a disposable', () => {
    const d = api.showSidebarPanel('id', 'title', 'content');
    expect(typeof d.dispose).toBe('function');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('showMessage warns', () => {
    api.showMessage('hello');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('registerCommand returns a disposable', () => {
    const d = api.registerCommand('cmd', () => {});
    expect(typeof d.dispose).toBe('function');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('getStorage returns null and warns', async () => {
    const result = await api.getStorage('key');
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('setStorage warns', async () => {
    await api.setStorage('key', 'val');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('createPluginAPI returns a PluginAPI instance', () => {
    expect(createPluginAPI()).toBeInstanceOf(PluginAPI);
  });
});
