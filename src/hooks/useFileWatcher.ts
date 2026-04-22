import { useEffect, useRef, useCallback, useMemo } from 'react';
import { watch, type UnwatchFn, type WatchEvent } from '@tauri-apps/plugin-fs';
import { Tab } from '../types';

export interface FileWatcherOptions {
  tabs: Tab[];
  enabled?: boolean;
  onFileChanged: (tabId: string, filePath: string) => void;
  onFileDeleted: (tabId: string, filePath: string) => void;
}

/** Record of recent self-save timestamps to ignore self-triggered changes */
const recentSaves = new Map<string, number>();
const SELF_SAVE_IGNORE_MS = 1000;

/** Call this after saving a file to suppress the resulting watch event */
export function markSelfSave(filePath: string): void {
  recentSaves.set(filePath, Date.now());
  // Clean up old entries
  const now = Date.now();
  for (const [key, ts] of recentSaves) {
    if (now - ts > SELF_SAVE_IGNORE_MS + 500) recentSaves.delete(key);
  }
}

function isRemoveEvent(event: WatchEvent): boolean {
  const t = event.type;
  if (t === 'any' || t === 'other') return false;
  if (typeof t === 'object' && 'remove' in t) return true;
  return false;
}

export function useFileWatcher({ tabs, enabled = true, onFileChanged, onFileDeleted }: FileWatcherOptions): void {
  const watchersRef = useRef<Map<string, () => void>>(new Map());
  const debouncedRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const callbacksRef = useRef({ onFileChanged, onFileDeleted });

  // Keep callbacks fresh
  callbacksRef.current = { onFileChanged, onFileDeleted };

  const stopWatcher = useCallback((filePath: string) => {
    const unwatch = watchersRef.current.get(filePath);
    if (unwatch) {
      unwatch();
      watchersRef.current.delete(filePath);
    }
    const timer = debouncedRef.current.get(filePath);
    if (timer) {
      clearTimeout(timer);
      debouncedRef.current.delete(filePath);
    }
  }, []);

  // Stable string of file paths that need watching — only changes when
  // the actual set of watched files changes, not on every tabs reference update.
  const watchedPathsStr = useMemo(
    () =>
      tabs
        .filter((t) => t.filePath)
        .map((t) => t.filePath!)
        .sort()
        .join('\0'),
    [tabs],
  );

  useEffect(() => {
    if (!enabled) {
      // Stop all watchers when disabled
      for (const path of watchersRef.current.keys()) {
        stopWatcher(path);
      }
      return;
    }

    const currentTabs = tabsRef.current;
    const currentPaths = new Set(
      currentTabs.filter((tab) => tab.filePath).map((tab) => tab.filePath!)
    );
    const watchedPaths = new Set(watchersRef.current.keys());

    // Start watching new files
    for (const filePath of currentPaths) {
      if (watchedPaths.has(filePath)) continue;

      const tabId = currentTabs.find((t) => t.filePath === filePath)?.id;
      if (!tabId) continue;

      // Add sentinel so the .then() guard can detect early cancellation
      watchersRef.current.set(filePath, () => { watchersRef.current.delete(filePath); });

      let unwatch: UnwatchFn | undefined;
      watch(filePath, (event: WatchEvent) => {
        // Ignore self-triggered saves
        const saveTs = recentSaves.get(filePath);
        if (saveTs && Date.now() - saveTs < SELF_SAVE_IGNORE_MS) return;

        // Debounce
        const existing = debouncedRef.current.get(filePath);
        if (existing) clearTimeout(existing);

        debouncedRef.current.set(
          filePath,
          setTimeout(() => {
            debouncedRef.current.delete(filePath);
            if (isRemoveEvent(event)) {
              callbacksRef.current.onFileDeleted(tabId, filePath);
            } else {
              callbacksRef.current.onFileChanged(tabId, filePath);
            }
          }, 300)
        );
      }).then((fn) => {
        unwatch = fn;
        // If component unmounted or tab closed before watch resolved, stop immediately
        if (!watchersRef.current.has(filePath)) {
          unwatch();
          return;
        }
        watchersRef.current.set(filePath, () => {
          unwatch?.();
          watchersRef.current.delete(filePath);
        });
      }).catch((err) => {
        watchersRef.current.delete(filePath);
        console.error('[useFileWatcher] watch() failed for', filePath, err);
      });
    }

    // Stop watching closed tabs
    for (const filePath of watchedPaths) {
      if (!currentPaths.has(filePath)) {
        stopWatcher(filePath);
      }
    }

    // Cleanup on unmount
    return () => {
      for (const path of [...watchersRef.current.keys()]) {
        stopWatcher(path);
      }
    };
  }, [enabled, stopWatcher, watchedPathsStr]);
}
