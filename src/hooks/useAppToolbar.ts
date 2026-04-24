/**
 * useAppToolbar — stable callback handlers for AppShell toolbar / tab bar.
 *
 * Extracts all useCallback declarations that were previously inline in AppShell,
 * reducing AppShell's line count and keeping toolbar logic co-located.
 */
import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { useUIStore } from '../stores';
import { restoreSnapshot } from '../lib/storage/version-history';
import { milkdownBridge } from '../lib/milkdown/editor-bridge';

export interface UseAppToolbarParams {
  handleSaveWithWatchMark: () => void;
  handleSaveAsFile: () => void | Promise<void>;
  handleExportPng: (target: HTMLElement | null) => Promise<void>;
  previewRef: RefObject<HTMLElement | null>;
  spellCheck: boolean;
  setSpellCheck: (v: boolean) => void;
  vimMode: boolean;
  setVimMode: (v: boolean) => void;
  showAIPanel: boolean;
  setShowAIPanel: (v: boolean) => void;
  milkdownPreview: boolean;
  cmViewRef: RefObject<EditorView | null>;
  renameTab: (id: string, name: string) => Promise<boolean>;
  setRenamingTabId: (id: string | null) => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  setCtxMenu: (v: { x: number; y: number; tabId: string } | null) => void;
  activeTabFilePath: string | null;
  updateActiveDoc: (content: string) => void;
}

export function useAppToolbar({
  handleSaveWithWatchMark,
  handleSaveAsFile,
  handleExportPng,
  previewRef,
  spellCheck, setSpellCheck,
  vimMode, setVimMode,
  showAIPanel, setShowAIPanel,
  milkdownPreview, cmViewRef,
  renameTab, setRenamingTabId,
  pinTab, unpinTab, setCtxMenu,
  activeTabFilePath,
  updateActiveDoc,
}: UseAppToolbarParams) {
  const stableOnSaveFile = useCallback(
    () => handleSaveWithWatchMark(),
    [handleSaveWithWatchMark],
  );

  const stableOnSaveAsFile = useCallback(
    () => handleSaveAsFile(),
    [handleSaveAsFile],
  );

  const stableOnExportPng = useCallback(
    () => handleExportPng(previewRef.current),
    [handleExportPng, previewRef],
  );

  const stableOnToggleSpellCheck = useCallback(
    () => setSpellCheck(!spellCheck),
    [setSpellCheck, spellCheck],
  );

  const stableOnToggleVimMode = useCallback(
    () => setVimMode(!vimMode),
    [setVimMode, vimMode],
  );

  const stableOnToggleAIPanel = useCallback(
    () => setShowAIPanel(!showAIPanel),
    [setShowAIPanel, showAIPanel],
  );

  const stableOnUndo = useCallback(() => {
    if (milkdownPreview) { milkdownBridge.undo?.(); return; }
    const v = cmViewRef.current; if (v) undo(v);
  }, [milkdownPreview, cmViewRef]);

  const stableOnRedo = useCallback(() => {
    if (milkdownPreview) { milkdownBridge.redo?.(); return; }
    const v = cmViewRef.current; if (v) redo(v);
  }, [milkdownPreview, cmViewRef]);

  const stableOnConfirmRename = useCallback(async (id: string, name: string) => {
    const ok = await renameTab(id, name);
    if (ok) setRenamingTabId(null);
  }, [renameTab, setRenamingTabId]);

  const stableOnCancelRename = useCallback(
    () => setRenamingTabId(null),
    [setRenamingTabId],
  );

  const stableOnPin = useCallback(
    (id: string) => { pinTab(id); setCtxMenu(null); },
    [pinTab, setCtxMenu],
  );

  const stableOnUnpin = useCallback(
    (id: string) => { unpinTab(id); setCtxMenu(null); },
    [unpinTab, setCtxMenu],
  );

  const stableOnUpdateClick = useCallback(() => {
    const cur = useUIStore.getState().showUpdateNotification;
    useUIStore.getState().setShowUpdateNotification(!cur);
  }, []);

  const stableOnSnapshotRestore = useCallback((id: string) => {
    if (!activeTabFilePath) return;
    const content = restoreSnapshot(activeTabFilePath, id);
    if (content !== null) updateActiveDoc(content);
  }, [activeTabFilePath, updateActiveDoc]);

  return {
    stableOnSaveFile,
    stableOnSaveAsFile,
    stableOnExportPng,
    stableOnToggleSpellCheck,
    stableOnToggleVimMode,
    stableOnToggleAIPanel,
    stableOnUndo,
    stableOnRedo,
    stableOnConfirmRename,
    stableOnCancelRename,
    stableOnPin,
    stableOnUnpin,
    stableOnUpdateClick,
    stableOnSnapshotRestore,
  };
}
