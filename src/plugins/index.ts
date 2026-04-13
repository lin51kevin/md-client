// Plugin System - Core Infrastructure

export type {
  ActivationEvent,
  Disposable,
  InstalledPluginRecord,
  PluginInstance,
  PluginManifest,
  PluginPermission,
  PluginStatus,
} from './types';

export { PluginAPI, createPluginAPI } from './plugin-api';
export { PluginLifecycle } from './plugin-lifecycle';
export {
  checkEngineVersion,
  loadPluginFromDirectory,
  loadPluginModule,
  validateManifest,
} from './plugin-loader';
export { PluginRegistry } from './plugin-registry';
export { PluginStorage } from './plugin-storage';
