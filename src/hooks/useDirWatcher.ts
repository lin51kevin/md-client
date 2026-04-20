/**
 * useDirWatcher — monitors expanded directories in the file tree for
 * external file-system changes (create / delete / rename).
 *
 * Emits a `onDirChanged(dirPath)` callback so the file tree can reload
 * only the affected directory instead of the whole tree.
 *
 * Behaviour:
 *  - Watches only the directories the caller reports as "expanded".
 *  - Debounces rapid events within the same directory (500 ms).
 *  - Ignores file-content modifications (handled by useFileWatcher).
 *  - Stable: only starts/stops watchers when the expanded-dir set actually changes.
 */
import { useEffect, useRef, useCallback } from 'react';
import { watch, type UnwatchFn, type WatchEvent } from '@tauri-apps/plugin-fs';

/** Debounce window — multiple events in the same dir are coalesced. */
const DIR_DEBOUNCE_MS = 500;

interface UseDirWatcherOptions {
  /** Set of directory paths that are currently expanded in the file tree. */
  expandedDirs: Set<string>;
  /** Called when a directory's contents may have changed. */
  onDirChanged: (dirPath: string) => void;
  /** Master toggle (e.g. set to false when sidebar is hidden). */
  enabled?: boolean;
}

function isStructuralEvent(event: WatchEvent): boolean {
  const t = event.type;
  if (typeof t === 'object') {
    if ('create' in t || 'remove' in t) return true;
  }
  // 'any' and 'other' — could be structural, treat as structural to be safe
  if (t === 'any' || t === 'other') return true;
  return false;
}

/** Compare two sets and return [added, removed] entries. */
function diffSets(current: Set<string>, prev: Set<string>): [Set<string>, Set<string>] {
  const added = new Set<string>();
  const removed = new Set<string>();
  for (const p of current) {
    if (!prev.has(p)) added.add(p);
  }
  for (const p of prev) {
    if (!current.has(p)) removed.add(p);
  }
  return [added, removed];
}

export function useDirWatcher({
  expandedDirs,
  onDirChanged,
  enabled = true,
}: UseDirWatcherOptions): void {
  const watchersRef = useRef<Map<string, UnwatchFn>>(new Map());
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cbRef = useRef(onDirChanged);
  cbRef.current = onDirChanged;
  const prevDirsRef = useRef<Set<string>>(new Set());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stopWatcher = useCallback((dirPath: string) => {
    const unwatch = watchersRef.current.get(dirPath);
    if (unwatch) {
      unwatch();
      watchersRef.current.delete(dirPath);
    }
    const timer = debounceRef.current.get(dirPath);
    if (timer) {
      clearTimeout(timer);
      debounceRef.current.delete(dirPath);
    }
  }, []);

  const startWatcher = useCallback((dirPath: string) => {
    // Placeholder — replaced when watch resolves
    const noop: UnwatchFn = () => {
      watchersRef.current.delete(dirPath);
    };
    watchersRef.current.set(dirPath, noop);

    watch(dirPath, (event: WatchEvent) => {
      if (!isStructuralEvent(event)) return;

      // Debounce per directory
      const existing = debounceRef.current.get(dirPath);
      if (existing) clearTimeout(existing);

      debounceRef.current.set(
        dirPath,
        setTimeout(() => {
          debounceRef.current.delete(dirPath);
          // Only fire if still enabled and dir is still in expanded set
          if (enabledRef.current && prevDirsRef.current.has(dirPath)) {
            cbRef.current(dirPath);
          }
        }, DIR_DEBOUNCE_MS),
      );
    })
      .then((unwatch) => {
        if (!enabledRef.current || !prevDirsRef.current.has(dirPath)) {
          unwatch();
          watchersRef.current.delete(dirPath);
          return;
        }
        watchersRef.current.set(dirPath, unwatch);
      })
      .catch((err) => {
        watchersRef.current.delete(dirPath);
        console.warn('[useDirWatcher] watch() failed for', dirPath, err);
      });
  }, []);

  useEffect(() => {
    const prev = prevDirsRef.current;
    const [added, removed] = diffSets(expandedDirs, prev);

    // Update snapshot
    prevDirsRef.current = new Set(expandedDirs);

    if (!enabled) {
      // Stop everything
      for (const dirPath of prev) {
        stopWatcher(dirPath);
      }
      return;
    }

    // Stop watchers for collapsed dirs
    for (const dirPath of removed) {
      stopWatcher(dirPath);
    }

    // Start watchers for newly-expanded dirs
    for (const dirPath of added) {
      startWatcher(dirPath);
    }
  }, [expandedDirs, enabled, stopWatcher, startWatcher]);

  // Cleanup on unmount only — separate effect so it does not run on re-render
  useEffect(() => {
    return () => {
      for (const path of watchersRef.current.keys()) {
        stopWatcher(path);
      }
      prevDirsRef.current = new Set();
    };
  }, [stopWatcher]);
}
