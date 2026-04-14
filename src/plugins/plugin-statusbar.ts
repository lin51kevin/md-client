import type { PluginContext } from './plugin-sandbox';

/**
 * Create the status bar API for plugin contexts.
 * Allows plugins to add/remove items in the editor status bar.
 *
 * @param deps - Status bar integration callbacks from the host app.
 * @returns The statusbar portion of the plugin context.
 */
export function createStatusBarAPI(deps: {
  addStatusBarItem: (element: unknown) => void;
  removeStatusBarItem: (element: unknown) => void;
}): PluginContext['statusbar'] {
  return {
    /**
     * Add a custom item to the status bar.
     * @param element - The DOM element or component to display.
     * @returns A disposable that removes the item on dispose.
     */
    addItem(element: unknown) {
      deps.addStatusBarItem(element);
      return { dispose() { deps.removeStatusBarItem(element); } };
    },
  };
}