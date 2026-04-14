import type { Disposable } from './types';

/**
 * 插件 API stub — Phase 2 再对接真实功能。
 * 所有方法目前只打印警告。
 */
export class PluginAPI {
  /**
   * Read the content of a file.
   * @param _path - Absolute file path to read.
   * @returns File content as string, or null if not found.
   * @deprecated Stub — not yet implemented. Will be available in Phase 2.
   */
  getFileContent(_path: string): Promise<string | null> {
    console.warn('[PluginHost] PluginAPI.getFileContent is not yet implemented');
    return Promise.resolve(null);
  }

  /**
   * Write content to a file.
   * @param _path - Absolute file path to write.
   * @param _content - Content to write.
   * @deprecated Stub — not yet implemented.
   */
  writeFile(_path: string, _content: string): Promise<void> {
    console.warn('[PluginHost] PluginAPI.writeFile is not yet implemented');
    return Promise.resolve();
  }

  /**
   * Show an item in the status bar.
   * @param _id - Unique identifier for the item.
   * @param _text - Display text.
   * @returns A disposable to remove the item.
   * @deprecated Stub — not yet implemented.
   */
  showStatusBarItem(_id: string, _text: string): Disposable {
    console.warn('[PluginHost] PluginAPI.showStatusBarItem is not yet implemented');
    return { dispose: () => {} };
  }

  /**
   * Show a panel in the sidebar.
   * @param _id - Unique identifier for the panel.
   * @param _title - Panel title.
   * @param _content - Panel content (HTML string).
   * @returns A disposable to remove the panel.
   * @deprecated Stub — not yet implemented.
   */
  showSidebarPanel(_id: string, _title: string, _content: string): Disposable {
    console.warn('[PluginHost] PluginAPI.showSidebarPanel is not yet implemented');
    return { dispose: () => {} };
  }

  /**
   * Show a message to the user.
   * @param _message - Message text to display.
   * @deprecated Stub — not yet implemented.
   */
  showMessage(_message: string): void {
    console.warn('[PluginHost] PluginAPI.showMessage is not yet implemented');
  }

  /**
   * Register a custom command.
   * @param _id - Command identifier.
   * @param _handler - Command handler function.
   * @returns A disposable to unregister the command.
   * @deprecated Stub — not yet implemented.
   */
  registerCommand(_id: string, _handler: () => void): Disposable {
    console.warn('[PluginHost] PluginAPI.registerCommand is not yet implemented');
    return { dispose: () => {} };
  }

  /**
   * Get a value from plugin-scoped storage.
   * @param _key - Storage key (auto-namespaced).
   * @returns Stored value or null.
   * @deprecated Stub — not yet implemented.
   */
  getStorage(_key: string): Promise<string | null> {
    console.warn('[PluginHost] PluginAPI.getStorage is not yet implemented');
    return Promise.resolve(null);
  }

  /**
   * Set a value in plugin-scoped storage.
   * @param _key - Storage key (auto-namespaced).
   * @param _value - Value to store.
   * @deprecated Stub — not yet implemented.
   */
  setStorage(_key: string, _value: string): Promise<void> {
    console.warn('[PluginHost] PluginAPI.setStorage is not yet implemented');
    return Promise.resolve();
  }
}

/** 创建一个新的插件 API 实例 */
export function createPluginAPI(): PluginAPI {
  return new PluginAPI();
}
