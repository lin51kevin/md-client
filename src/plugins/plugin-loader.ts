import type { PluginManifest } from './types';
import { verifyPluginSignature, SignatureStatus } from './signature-verify';

import pkg from '../../package.json';

function getAppVersion(): string {
  return (pkg as { version?: string }).version ?? '0.0.0';
}

/**
 * 校验 manifest 格式，不合法则抛错。
 */
export function validateManifest(manifest: unknown): PluginManifest {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('[PluginHost] Invalid manifest: expected an object');
  }

  const m = manifest as Record<string, unknown>;

  const required: (keyof PluginManifest)[] = [
    'id',
    'name',
    'version',
    'description',
    'author',
    'main',
    'activationEvents',
    'permissions',
  ];

  for (const key of required) {
    if (!m[key]) {
      throw new Error(`[PluginHost] Invalid manifest: missing "${key}"`);
    }
  }

  if (!Array.isArray(m.activationEvents)) {
    throw new Error('[PluginHost] Invalid manifest: activationEvents must be an array');
  }
  if (!Array.isArray(m.permissions)) {
    throw new Error('[PluginHost] Invalid manifest: permissions must be an array');
  }

  return m as unknown as PluginManifest;
}

/**
 * 检查 marklite 版本是否满足插件要求（semver 简化比较，只取 major.minor）。
 */
export function checkEngineVersion(manifest: PluginManifest): boolean {
  if (!manifest.engines?.marklite) {
    return true;
  }

  const current = getAppVersion();
  const required = manifest.engines.marklite;

  const parse = (v: string) =>
    v.replace(/^[\^~>=<\s]*/, '').split('.').map(Number);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);
  const [rMajor = 0, rMinor = 0, rPatch = 0] = parse(required);

  if (cMajor !== rMajor) return cMajor > rMajor;
  if (cMinor !== rMinor) return cMinor > rMinor;
  return cPatch >= rPatch;
}

/**
 * 从目录读取 manifest.json（Web 环境下用于 bundled 插件）。
 */
export async function loadPluginFromDirectory(
  dirPath: string,
): Promise<PluginManifest> {
  try {
    const resp = await fetch(`${dirPath.replace(/\/?$/, '/')}/manifest.json`);
    if (!resp.ok) {
      throw new Error(`[PluginHost] Failed to fetch manifest from ${dirPath}: ${resp.status}`);
    }
    const raw: unknown = await resp.json();
    return validateManifest(raw);
  } catch (err) {
    throw new Error(
      `[PluginHost] Cannot load plugin from ${dirPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * 动态 import 插件入口模块。
 */

/**
 * Validate that a plugin id contains no path traversal sequences.
 * id must not contain /, \, .., or URL-encoded equivalents.
 */
export function validatePluginId(id: string): void {
  const decoded = id.replace(/%2e/gi, '.').replace(/%2f/gi, '/').replace(/%5c/gi, '\\');
  if (/[/\\]/.test(decoded) || decoded.includes('..')) {
    throw new Error(
      `[PluginHost] Invalid plugin id "${id}": path traversal detected`,
    );
  }
}

/**
 * Validate that a plugin main entry path contains no path traversal sequences.
 * main must not start with / or \ and must not contain .. segments.
 */
function validatePluginMain(main: string): void {
  const decoded = main.replace(/%2e/gi, '.').replace(/%2f/gi, '/').replace(/%5c/gi, '\\');
  if (decoded.startsWith('/') || decoded.startsWith('\\') || decoded.includes('..')) {
    throw new Error(
      `[PluginHost] Invalid plugin main "${main}": path traversal detected`,
    );
  }
}

export async function loadPluginModule(
  manifest: PluginManifest,
): Promise<{ activate?: () => Promise<void>; deactivate?: () => Promise<void> }> {
  // Security: validate id and main before constructing the module URL
  validatePluginId(manifest.id);
  validatePluginMain(manifest.main);

  // Security: run signature verification (logs status; blocks only on Failed)
  const sigResult = verifyPluginSignature(manifest, { publicKeys: [] });
  if (sigResult.status === SignatureStatus.Failed) {
    throw new Error(
      `[PluginHost] Signature verification failed for plugin "${manifest.id}": ${sigResult.message}`,
    );
  }
  if (sigResult.status === SignatureStatus.Missing || sigResult.status === SignatureStatus.Skipped) {
    console.warn(`[PluginHost] Plugin "${manifest.id}" loaded without signature verification: ${sigResult.message}`);
  }

  try {
    // 预期插件被打包到 /plugins/{id}/dist/index.js
    const moduleUrl = `/plugins/${manifest.id}/${manifest.main}`;
    const mod = await import(/* @vite-ignore */ moduleUrl);
    return {
      activate: mod.activate as (() => Promise<void>) | undefined,
      deactivate: mod.deactivate as (() => Promise<void>) | undefined,
    };
  } catch (err) {
    console.warn(
      `[PluginHost] Failed to load module for plugin "${manifest.id}": ${err instanceof Error ? err.message : String(err)}`,
    );
    return {};
  }
}
