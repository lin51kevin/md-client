/**
 * @marklite/plugin-api — TypeScript type definitions for MarkLite++ plugin development.
 *
 * This package provides all the type definitions needed to develop plugins for MarkLite++
 * without cloning the full source tree. Install it as a dev dependency:
 *
 *   yarn add -D @marklite/plugin-api
 */

// ── Core types ─────────────────────────────────────────────────────────────

export interface Disposable {
  dispose(): void;
}

// ── Plugin manifest ────────────────────────────────────────────────────────

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  activationEvents: ActivationEvent[];
  permissions: PluginPermission[];
  engines?: { marklite: string };
}

export type ActivationEvent =
  | 'onStartup'
  | 'onFileOpen'
  | 'onFileOpen:.md'
  | 'onWorkspaceReady'
  | `onCommand:${string}`;

// ── Permissions ────────────────────────────────────────────────────────────

export type PluginPermission =
  | 'file.read'
  | 'file.write'
  | 'file.watch'
  | 'sidebar.panel'
  | 'statusbar.item'
  | 'contextmenu.item'
  | 'editor.read'
  | 'editor.write'
  | 'editor.decorate'
  | 'workspace'
  | 'preview.extend'
  | 'settings.section'
  | 'theme'
  | 'export'
  | 'ui.message'
  | 'storage'
  | 'commands'
  | 'tauri.raw';

// ── API interfaces ─────────────────────────────────────────────────────────

export interface CommandsAPI {
  register(
    id: string,
    handler: (...args: unknown[]) => void,
    options?: { label?: string; labelEn?: string; when?: () => boolean; category?: string }
  ): Disposable;
}

export interface EditorAPI {
  getContent(): string;
  getSelection(): { from: number; to: number; text: string } | null;
  getCursorPosition(): { line: number; column: number; offset: number };
  insertText(text: string, from?: number, to?: number): void;
  replaceRange(from: number, to: number, text: string): void;
  getActiveFilePath(): string | null;
}

export interface WorkspaceAPI {
  getActiveFile(): { path: string | null; name: string | null };
  getAllFiles(): string[];
  openFile(path: string): void;
  onFileChanged(callback: (file: { path: string; name: string }) => void): Disposable;
}

export interface SidebarAPI {
  registerPanel(id: string, options: { title: string; icon?: string; render: () => unknown }): Disposable;
}

export interface StatusBarAPI {
  addItem(element: unknown): Disposable;
}

export interface StorageAPI {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface UIAPI {
  showMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
  showModal(options: { title: string; content: string }): Promise<void>;
}

// ── Plugin context ─────────────────────────────────────────────────────────

export interface PluginContext {
  commands: CommandsAPI;
  sidebar: SidebarAPI;
  statusbar: StatusBarAPI;
  editor: EditorAPI;
  workspace: WorkspaceAPI;
  storage: StorageAPI;
  ui: UIAPI;
  files: {
    readFile(path: string): Promise<string | null>;
    watch(pattern: string, callback: (path: string) => void): Disposable;
  };
  contextMenu: { addItem(item: unknown): Disposable };
  preview: { registerRenderer(type: string, renderFn: unknown): Disposable };
  settings: { registerSection(section: unknown): Disposable };
  theme: { register(cssVars: unknown): Disposable };
  export: { registerExporter(format: string, fn: unknown): Disposable };
}
