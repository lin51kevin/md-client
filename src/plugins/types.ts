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
  | 'editor.extend'
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
  activate?: (ctx?: import('./plugin-sandbox').PluginContext) => Promise<void>;
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

/** A preview renderer registered by a plugin. */
export interface PreviewRendererEntry {
  /** Plugin that registered this renderer. */
  pluginId: string;
  /** The HTML element type to override (e.g. 'blockquote', 'p', 'h1'). */
  nodeType: string;
  /**
   * Render function invoked by the preview component.
   * Receives the element props plus a `defaultRender` component for composition.
   */
  render: (props: Record<string, unknown> & { defaultRender: React.ComponentType<Record<string, unknown>> }) => React.ReactNode;
}
