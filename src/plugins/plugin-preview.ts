import type { Disposable } from './types';

export interface PreviewAPIDeps {
  registerPreviewRenderer: (nodeType: string, renderFn: unknown) => void;
  unregisterPreviewRenderer: (nodeType: string) => void;
  registerPreviewRemarkPlugin?: (plugin: unknown) => Disposable;
  unregisterPreviewRemarkPlugin?: (plugin: unknown) => void;
}

/**
 * Create the preview API for plugin contexts.
 * Allows plugins to register custom renderers for markdown preview elements.
 */
export function createPreviewAPI(deps: PreviewAPIDeps) {
  const registered = new Set<string>();

  return {
    registerRenderer(nodeType: string, renderFn: unknown): Disposable {
      registered.add(nodeType);
      deps.registerPreviewRenderer(nodeType, renderFn);

      let disposed = false;
      return {
        dispose() {
          if (disposed) return;
          disposed = true;
          registered.delete(nodeType);
          deps.unregisterPreviewRenderer(nodeType);
        },
      };
    },
    registerRemarkPlugin(plugin: unknown): Disposable {
      if (!deps.registerPreviewRemarkPlugin) {
        throw new Error('Remark plugin registration is not supported in this environment');
      }
      deps.registerPreviewRemarkPlugin(plugin);

      let disposed = false;
      return {
        dispose() {
          if (disposed) return;
          disposed = true;
          deps.unregisterPreviewRemarkPlugin?.(plugin);
        },
      };
    },
  };
}
