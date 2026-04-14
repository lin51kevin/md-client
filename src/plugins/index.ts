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

export { createCommandsAPI } from './plugin-commands';
export { createWorkspaceAPI } from './plugin-workspace';
export { createEditorAPI } from './plugin-editor';
export { createSidebarAPI } from './plugin-sidebar';
export { createStatusBarAPI } from './plugin-statusbar';
export { createStorageAPI } from './plugin-storage';
export { createUIAPI } from './plugin-ui';
export { createPluginContext, type PluginContextDeps } from './plugin-context-factory';
export {
  verifyPluginSignature,
  createSignatureVerifier,
  SignatureStatus,
} from './signature-verify';
export type {
  SignatureResult,
  SignatureVerifyOptions,
  SignaturePublicKey,
  SignatureAlgorithm,
  SignatureManifest,
} from './signature-verify';
