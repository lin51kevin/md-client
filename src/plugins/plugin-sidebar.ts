export function createSidebarAPI(deps: {
  registerSidebarPanel: (id: string, component: unknown) => void;
  unregisterSidebarPanel: (id: string) => void;
}): Record<string, (...args: unknown[]) => unknown> {
  const registeredPanels = new Map<string, unknown>();

  return {
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
