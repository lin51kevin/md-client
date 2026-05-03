/**
 * marklite-minimap — Official Minimap plugin.
 *
 * Dynamically imports @replit/codemirror-minimap and registers the extension
 * via the minimap-bridge so the core editor can conditionally load it.
 */
import type { PluginContext } from '../../../plugin-sandbox';
import { registerMinimap, unregisterMinimap } from '../../../../lib/cm/minimap-bridge';

export async function activate(_context: PluginContext) {
  const { showMinimap } = await import('@replit/codemirror-minimap');
  const ext = showMinimap.compute(['doc'], (_state) => ({
    create: (view) => {
      const dom = view.dom.ownerDocument.createElement('div');
      return { dom };
    },
    displayText: 'blocks',
    showOverlay: 'mouse-over',
  }));
  registerMinimap(ext);
  return {
    deactivate: () => unregisterMinimap(),
  };
}
