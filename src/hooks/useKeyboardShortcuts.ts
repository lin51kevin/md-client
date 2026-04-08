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
  toggleFindReplace?: () => void;
}

export function useKeyboardShortcuts(params: ShortcutsParams) {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const { createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile, closeTab, setViewMode, activeTabIdRef, toggleFindReplace } = paramsRef.current;
      
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); createNewTab(); }
      else if (e.key === 'o' || e.key === 'O') { e.preventDefault(); handleOpenFile(); }
      else if (e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); handleSaveAsFile(); }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleSaveFile(); }
      else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); closeTab(activeTabIdRef.current); }
      else if (e.key === '1') { e.preventDefault(); setViewMode('edit'); }
      else if (e.key === '2') { e.preventDefault(); setViewMode('split'); }
      else if (e.key === '3') { e.preventDefault(); setViewMode('preview'); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFindReplace?.(); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); toggleFindReplace?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
