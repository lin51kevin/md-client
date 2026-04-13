import type { PluginManifest } from './types';

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
  const [cMajor = 0, cMinor = 0] = parse(current);
  const [rMajor = 0, rMinor = 0] = parse(required);

  if (cMajor !== rMajor) return cMajor > rMajor;
  return cMinor >= rMinor;
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
export async function loadPluginModule(
  manifest: PluginManifest,
): Promise<{ activate?: () => Promise<void>; deactivate?: () => Promise<void> }> {
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
