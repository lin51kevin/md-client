/**
 * marklite-minimap — Official Minimap plugin.
 *
 * Dynamically imports @codemirror/minimap and registers the extension
 * via the minimap-bridge so the core editor can conditionally load it.
 */
import type { PluginContext } from '../../../../plugins/plugin-sandbox';
import { registerMinimap, unregisterMinimap } from '../../../../lib/cm/minimap-bridge';

export async function activate(_context: PluginContext) {
  const { minimap } = await import('@codemirror/minimap');
  registerMinimap(minimap());
  return {
    deactivate: () => unregisterMinimap(),
  };
}
