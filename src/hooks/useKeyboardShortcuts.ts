import { useEffect, useRef, MutableRefObject } from 'react';
import { ViewMode, FocusMode } from '../types';

interface ShortcutsParams {
  createNewTab: () => void;
  handleOpenFile: () => void;
  handleSaveFile: (tabId?: string) => Promise<void>;
  handleSaveAsFile: (tabId?: string) => Promise<void>;
  closeTab: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  activeTabIdRef: MutableRefObject<string>;
  toggleFindReplace?: () => void;
  /** F009 — 焦点模式切换 */
  setFocusMode?: (mode: FocusMode) => void;
  focusMode?: FocusMode;
}

export function useKeyboardShortcuts(params: ShortcutsParams) {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const { createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile, closeTab, setViewMode, activeTabIdRef, toggleFindReplace, setFocusMode, focusMode } = paramsRef.current;
      
      // F009 — ESC 退出任何焦点模式（优先处理，无需 Ctrl）
      if (e.key === 'Escape' && focusMode && focusMode !== 'normal') {
        e.preventDefault();
        setFocusMode?.('normal');
        return;
      }

      if (!ctrl) return;
      
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

      // F009 — 焦点模式快捷键
      else if (e.key === '.') { e.preventDefault(); setFocusMode?.(focusMode === 'typewriter' ? 'normal' : 'typewriter'); } // Ctrl+. 打字机模式切换
      else if (e.key === ',') { e.preventDefault(); setFocusMode?.(focusMode === 'focus' ? 'normal' : 'focus'); } // Ctrl+, 专注模式切换
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
