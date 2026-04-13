import type { Disposable } from './types';

/**
 * 插件 API stub — Phase 2 再对接真实功能。
 * 所有方法目前只打印警告。
 */
export class PluginAPI {
  getFileContent(_path: string): Promise<string | null> {
    console.warn('[PluginHost] PluginAPI.getFileContent is not yet implemented');
    return Promise.resolve(null);
  }

  writeFile(_path: string, _content: string): Promise<void> {
    console.warn('[PluginHost] PluginAPI.writeFile is not yet implemented');
    return Promise.resolve();
  }

  showStatusBarItem(_id: string, _text: string): Disposable {
    console.warn('[PluginHost] PluginAPI.showStatusBarItem is not yet implemented');
    return { dispose: () => {} };
  }

  showSidebarPanel(_id: string, _title: string, _content: string): Disposable {
    console.warn('[PluginHost] PluginAPI.showSidebarPanel is not yet implemented');
    return { dispose: () => {} };
  }

  showMessage(_message: string): void {
    console.warn('[PluginHost] PluginAPI.showMessage is not yet implemented');
  }

  registerCommand(_id: string, _handler: () => void): Disposable {
    console.warn('[PluginHost] PluginAPI.registerCommand is not yet implemented');
    return { dispose: () => {} };
  }

  getStorage(_key: string): Promise<string | null> {
    console.warn('[PluginHost] PluginAPI.getStorage is not yet implemented');
    return Promise.resolve(null);
  }

  setStorage(_key: string, _value: string): Promise<void> {
    console.warn('[PluginHost] PluginAPI.setStorage is not yet implemented');
    return Promise.resolve();
  }
}

/** 创建一个新的插件 API 实例 */
export function createPluginAPI(): PluginAPI {
  return new PluginAPI();
}
