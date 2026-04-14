import { useCallback, useRef } from 'react';
import type { PluginContextDeps } from '../plugins/plugin-context-factory';
import type { PluginContext } from '../plugins/plugin-sandbox';
import { createPluginContext } from '../plugins/plugin-context-factory';

/** Map of official bundled plugin IDs to their module import functions. */
const OFFICIAL_PLUGIN_MODULES: Record<string, () => Promise<{ activate?: (ctx: PluginContext) => unknown }>> = {
  'marklite-backlinks': () => import('../plugins/official/backlinks/src/index'),
  'marklite-graph-view': () => import('../plugins/official/graph-view/src/index'),
  'marklite-snippet-manager': () => import('../plugins/official/snippet-manager/src/index'),
  'marklite-preview-edit': () => import('../plugins/official/preview-edit/src/index'),
};

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

    // Resolve the module
    const officialLoader = OFFICIAL_PLUGIN_MODULES[id];
    if (!officialLoader) {
      console.warn(`[PluginRuntime] Unknown plugin "${id}" — only official plugins are supported currently`);
      return;
    }

    try {
      const mod = await officialLoader();
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

  return { activatePlugin, deactivatePlugin };
}
