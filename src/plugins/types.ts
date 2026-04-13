// 插件清单 manifest.json 对应的类型
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

export type PluginStatus = 'installed' | 'active' | 'disabled' | 'error';

export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  grantedPermissions: PluginPermission[];
  activate?: () => Promise<void>;
  deactivate?: () => Promise<void>;
}

export interface InstalledPluginRecord {
  id: string;
  manifest: PluginManifest;
  enabled: boolean;
  grantedPermissions: PluginPermission[];
  installedAt: number;
}

export interface Disposable {
  dispose(): void;
}
