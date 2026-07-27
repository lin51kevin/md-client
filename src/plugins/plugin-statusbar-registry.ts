/**
 * Registry for plugin-contributed status bar items.
 *
 * Plugins call `context.statusbar.addItem(element)` with a DOM element; the
 * host StatusBar renders whatever is registered here. Mirrors the
 * plugin-context-menu registry pattern.
 */

const items = new Set<HTMLElement>();
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

/** Register a status bar element. If it has an id, any existing element with
 * the same id is replaced (prevents duplicates on plugin re-activation). */
export function registerStatusBarItem(element: HTMLElement): void {
  if (element.id) {
    for (const existing of items) {
      if (existing.id === element.id) items.delete(existing);
    }
  }
  items.add(element);
  notifyListeners();
}

/** Remove a previously registered status bar element. */
export function removeStatusBarItem(element: HTMLElement): void {
  items.delete(element);
  notifyListeners();
}

/** Current registered status bar elements, in insertion order. */
export function getStatusBarItems(): HTMLElement[] {
  return Array.from(items);
}

/** Subscribe to add/remove changes. Returns an unsubscribe function. */
export function onStatusBarItemsChanged(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
