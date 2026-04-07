import { useEffect, useRef, MutableRefObject } from 'react';
import { ViewMode } from '../types';

interface ShortcutsParams {
  createNewTab: () => void;
  handleOpenFile: () => void;
  handleSaveFile: (tabId?: string) => Promise<void>;
  handleSaveAsFile: (tabId?: string) => Promise<void>;
  closeTab: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  activeTabIdRef: MutableRefObject<string>;
}

export function useKeyboardShortcuts(params: ShortcutsParams) {
  // Always keep a fresh ref so the event listener never captures stale closures
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const { createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile, closeTab, setViewMode, activeTabIdRef } = paramsRef.current;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); createNewTab(); }
      else if (e.key === 'o' || e.key === 'O') { e.preventDefault(); handleOpenFile(); }
      else if (e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); handleSaveAsFile(); }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleSaveFile(); }
      else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); closeTab(activeTabIdRef.current); }
      else if (e.key === '1') { e.preventDefault(); setViewMode('edit'); }
      else if (e.key === '2') { e.preventDefault(); setViewMode('split'); }
      else if (e.key === '3') { e.preventDefault(); setViewMode('preview'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
