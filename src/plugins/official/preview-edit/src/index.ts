/**
 * Preview Editor plugin — DEPRECATED
 *
 * This plugin depended on Phase 1 AST-based editing modules (markdown-ast, edit-history, etc.)
 * which have been removed in favor of Milkdown's native editing capabilities.
 *
 * Keeping this file as a stub so the plugin registry doesn't break.
 */
import type { PluginContext } from '../../../../plugin-sandbox';

export function activate(_ctx: PluginContext) {
  // Deprecated: Milkdown now provides native WYSIWYG editing
  return {
    deactivate() {
      // no-op
    },
  };
}
