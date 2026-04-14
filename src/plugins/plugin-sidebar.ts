import type { PluginContext } from './plugin-sandbox';

/**
 * Create the sidebar API for plugin contexts.
 * Allows plugins to register custom panels in the sidebar.
 *
 * @param deps - Sidebar integration callbacks from the host app.
 * @returns The sidebar portion of the plugin context.
 */
export function createSidebarAPI(deps: {
  registerSidebarPanel: (id: string, component: unknown) => void;
  unregisterSidebarPanel: (id: string) => void;
}): PluginContext['sidebar'] {
  const registeredPanels = new Map<string, unknown>();

  return {
    /**
     * Register a new sidebar panel.
     * @param id - Unique panel identifier.
     * @param options - Panel configuration (title, optional icon, render function).
     * @returns A disposable that removes the panel on dispose.
     */
    registerPanel(id: string, options: { title: string; icon?: string; render: () => unknown }) {
      const panelContent = options.render();
      registeredPanels.set(id, panelContent);
      deps.registerSidebarPanel(id, panelContent);
      return {
        dispose() {
          registeredPanels.delete(id);
          deps.unregisterSidebarPanel(id);
        },
      };
    },
  };
}