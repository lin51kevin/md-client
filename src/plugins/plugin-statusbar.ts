import type { PluginContext } from './plugin-sandbox';

export function createStatusBarAPI(deps: {
  addStatusBarItem: (element: unknown) => void;
  removeStatusBarItem: (element: unknown) => void;
}): PluginContext['statusbar'] {
  return {
    addItem(element: unknown) {
      deps.addStatusBarItem(element);
      return { dispose() { deps.removeStatusBarItem(element); } };
    },
  };
}