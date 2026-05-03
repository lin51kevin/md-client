/**
 * bridge-signal.ts — Reactive signal for plugin bridge changes.
 *
 * When a bridge (vim, minimap, etc.) registers or unregisters an extension,
 * it calls notifyBridgeChange(). The editor subscribes via useBridgeVersion()
 * so its extension list is re-computed with the new bridge state.
 */
import { useState, useEffect } from 'react';

let version = 0;
const listeners = new Set<() => void>();

export function notifyBridgeChange(): void {
  version++;
  listeners.forEach((fn) => fn());
}

export function useBridgeVersion(): number {
  const [v, setV] = useState(version);
  useEffect(() => {
    const handler = () => setV(version);
    listeners.add(handler);
    // Sync in case a change happened between initial render and effect
    if (v !== version) setV(version);
    return () => { listeners.delete(handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}
