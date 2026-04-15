import type { Disposable } from './types';

// ── Context Menu Item Types ────────────────────────────────────────────

/**
 * Condition under which a context menu item should be visible.
 */
export interface ContextMenuItemWhen {
  /** Show only when text is selected. */
  hasSelection?: boolean;
}

/**
 * A context menu item registered by a plugin.
 */
export interface PluginContextMenuItem {
  /** Unique item ID (e.g. 'ai.polish'). */
  id: string;
  /** Display label. */
  label: string;
  /** Optional icon name (lucide icon key). */
  icon?: string;
  /** Optional group name for visual grouping (items in the same group are separated by dividers). */
  group?: string;
  /** Sort order within the group (lower = earlier). */
  order?: number;
  /** Visibility condition. If omitted the item is always visible. */
  when?: ContextMenuItemWhen;
  /** Callback invoked when the item is clicked. */
  action: () => void;
}

// ── Registry ───────────────────────────────────────────────────────────

const registeredItems = new Map<string, PluginContextMenuItem>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

/**
 * Register a context menu item contributed by a plugin.
 * Returns a Disposable to remove the item.
 */
export function registerContextMenuItem(item: PluginContextMenuItem): Disposable {
  registeredItems.set(item.id, item);
  notifyListeners();
  return {
    dispose() {
      registeredItems.delete(item.id);
      notifyListeners();
    },
  };
}

/**
 * Query context menu items that match the current editor context.
 */
export function getPluginContextMenuItems(context: { hasSelection: boolean }): PluginContextMenuItem[] {
  const result: PluginContextMenuItem[] = [];
  for (const item of registeredItems.values()) {
    if (item.when?.hasSelection && !context.hasSelection) continue;
    result.push(item);
  }
  // Sort by group then order
  result.sort((a, b) => {
    const ga = a.group ?? '';
    const gb = b.group ?? '';
    if (ga !== gb) return ga.localeCompare(gb);
    return (a.order ?? 0) - (b.order ?? 0);
  });
  return result;
}

/**
 * Subscribe to context menu item changes (register/unregister).
 * Returns unsubscribe function.
 */
export function onContextMenuItemsChanged(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ── Plugin API factory ─────────────────────────────────────────────────

export interface ContextMenuAPI {
  addItem(item: Omit<PluginContextMenuItem, 'id'> & { id?: string }): Disposable;
}

/**
 * Create the contextMenu API surface exposed to plugins via PluginContext.
 */
export function createContextMenuAPI(): ContextMenuAPI {
  let counter = 0;
  return {
    addItem(item) {
      const id = item.id ?? `plugin-ctx-${++counter}`;
      return registerContextMenuItem({ ...item, id });
    },
  };
}
