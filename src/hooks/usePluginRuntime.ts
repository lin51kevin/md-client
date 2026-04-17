import { useCallback, useEffect, useRef } from 'react';
import type { PluginContextDeps } from '../plugins/plugin-context-factory';
import type { PluginContext } from '../plugins/plugin-sandbox';
import { createPluginContext } from '../plugins/plugin-context-factory';
import { validateManifest, checkEngineVersion, loadPluginModuleFromResource } from '../plugins/plugin-loader';
import { StorageKeys } from '../lib/storage';

/**
 * In DEV mode, plugins are bundled via Vite's dynamic imports for HMR.
 * In production, plugins are loaded at runtime from /plugins/{id}/.
 */
const DEV_PLUGIN_MODULES: Record<string, () => Promise<{ activate?: (ctx: PluginContext) => unknown }>> =
  import.meta.env.DEV ? {
    'marklite-backlinks': () => import('../plugins/official/backlinks/src/index'),
    'marklite-graph-view': () => import('../plugins/official/graph-view/src/index'),
    'marklite-ai-copilot': () => import('../plugins/official/ai-copilot/src/index'),
  } : {};

/** Official plugin IDs — used in production to discover externally-built plugins. */
const OFFICIAL_PLUGIN_IDS = [
  'marklite-backlinks',
  'marklite-graph-view',
  'marklite-ai-copilot',
];

interface ActivePluginEntry {
  deactivate?: () => void | Promise<void>;
}

/**
 * Manages the runtime activation/deactivation of plugins.
 *
 * Creates a real PluginContext from the provided deps and passes it
 * (sandboxed) to each plugin's activate() function.
 */
export function usePluginRuntime(deps: PluginContextDeps) {
  const activePlugins = useRef<Map<string, ActivePluginEntry>>(new Map());
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const activatePlugin = useCallback(async (id: string) => {
    // If already active, deactivate first
    const existing = activePlugins.current.get(id);
    if (existing) {
      try {
        await existing.deactivate?.();
      } catch (err) {
        console.warn(`[PluginRuntime] Error deactivating "${id}" before re-activation:`, err);
      }
      activePlugins.current.delete(id);
    }

    // Resolve the module — DEV uses Vite-bundled imports, PROD loads external bundles
    let mod: { activate?: (ctx: PluginContext) => unknown };

    if (import.meta.env.DEV && DEV_PLUGIN_MODULES[id]) {
      // Dev mode: bundled via Vite for HMR
      try {
        mod = await DEV_PLUGIN_MODULES[id]();
      } catch (err) {
        console.error(`[PluginRuntime] Failed to load plugin "${id}" (dev):`, err);
        return;
      }
    } else if (!import.meta.env.DEV && OFFICIAL_PLUGIN_IDS.includes(id)) {
      // Production: load plugin from Tauri resource directory
      try {
        const { resolveResource } = await import('@tauri-apps/api/path');
        const { readTextFile } = await import('@tauri-apps/plugin-fs');

        const manifestPath = await resolveResource(`plugins/${id}/manifest.json`);
        const manifestText = await readTextFile(manifestPath);
        const manifest = validateManifest(JSON.parse(manifestText));
        if (!checkEngineVersion(manifest)) {
          console.warn(`[PluginRuntime] Plugin "${id}" requires newer engine version`);
          return;
        }
        mod = await loadPluginModuleFromResource(manifest);
      } catch (err) {
        console.error(`[PluginRuntime] Failed to load plugin "${id}" (prod):`, err);
        return;
      }
    } else {
      console.warn(`[PluginRuntime] Unknown plugin "${id}"`);
      return;
    }

    try {
      if (!mod.activate) {
        console.warn(`[PluginRuntime] Plugin "${id}" has no activate() export`);
        return;
      }

      const ctx = createPluginContext(depsRef.current, id);
      const result = mod.activate(ctx) as { deactivate?: () => void | Promise<void> } | undefined;

      activePlugins.current.set(id, {
        deactivate: result?.deactivate,
      });
    } catch (err) {
      console.error(`[PluginRuntime] Failed to activate plugin "${id}":`, err);
    }
  }, []);

  const deactivatePlugin = useCallback(async (id: string) => {
    const entry = activePlugins.current.get(id);
    if (!entry) return;

    try {
      await entry.deactivate?.();
    } catch (err) {
      console.warn(`[PluginRuntime] Error deactivating plugin "${id}":`, err);
    }
    activePlugins.current.delete(id);
  }, []);

  // Auto-activate all enabled plugins on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(StorageKeys.INSTALLED_PLUGINS);
      if (!raw) return;
      const plugins = JSON.parse(raw) as { id: string; enabled: boolean }[];
      for (const p of plugins) {
        if (p.enabled) void activatePlugin(p.id);
      }
    } catch {
      // Plugins remain activatable via the panel
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activatePlugin, deactivatePlugin };
}
