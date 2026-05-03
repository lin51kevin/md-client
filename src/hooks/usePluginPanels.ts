import { useState, useCallback } from 'react';

export interface PluginPanelEntry {
  id: string;
  title: string;
  icon?: string;
  position?: 'left' | 'bottom';
  content: unknown;
}

/**
 * Manages sidebar panels registered by plugins at runtime.
 *
 * Returns stable callbacks for registering/unregistering panels,
 * plus the current list of active panels.
 */
export function usePluginPanels() {
  const [panels, setPanels] = useState<PluginPanelEntry[]>([]);

  const registerPanel = useCallback(
    (id: string, content: unknown, meta?: { title?: string; icon?: string; position?: 'left' | 'bottom' }) => {
      setPanels((prev) => {
        const existing = prev.find((p) => p.id === id);
        const entry: PluginPanelEntry = {
          id,
          title: meta?.title ?? id,
          icon: meta?.icon,
          position: meta?.position,
          content,
        };
        if (existing) {
          return prev.map((p) => (p.id === id ? entry : p));
        }
        return [...prev, entry];
      });
    },
    [],
  );

  const unregisterPanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { panels, registerPanel, unregisterPanel };
}
