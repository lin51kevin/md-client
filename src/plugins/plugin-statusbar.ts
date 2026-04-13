export function createStatusBarAPI(deps: {
  addStatusBarItem: (element: unknown) => void;
  removeStatusBarItem: (element: unknown) => void;
}): Record<string, (...args: unknown[]) => unknown> {
  return {
    addItem(element: unknown) {
      deps.addStatusBarItem(element);
      return { dispose() { deps.removeStatusBarItem(element); } };
    },
  };
}
