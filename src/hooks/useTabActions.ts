import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Tab } from '../types';
import type { TranslationKey } from '../i18n';
import { getPendingImages, clearPendingImages } from '../lib/pending-images';

type UnsavedChoice = 'save' | 'discard' | 'cancel';

interface UseTabActionsOptions {
  tabs: Tab[];
  closeTab: (id: string) => void;
  closeMultipleTabs: (ids: string[]) => void;
  setTabDisplayName: (id: string, name: string) => void;
  handleDismissWelcome: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** Save the tab before closing (used when user picks "Save") */
  handleSaveFile: (tabId: string) => Promise<void>;
}

export function useTabActions({
  tabs, closeTab, closeMultipleTabs, setTabDisplayName, handleDismissWelcome, t,
  handleSaveFile,
}: UseTabActionsOptions) {
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);

  const handleOpenSample = useCallback(() => {
    setTabDisplayName(tabs[0].id, 'sample.md');
    handleDismissWelcome();
  }, [tabs, setTabDisplayName, handleDismissWelcome]);

  /** Shared helper: ask user what to do about unsaved changes.
   *  Returns true if the tab should be closed, false if the close should be aborted. */
  const resolveUnsaved = useCallback(async (tab: Tab): Promise<boolean> => {
    const name = tab.filePath?.split(/[\\/]/).pop() ?? t('app.unsavedPath');
    const path = tab.filePath ?? t('app.unsavedPath');
    const message = t('app.closeTabUnsaved', { name, path }) + '\n\n' + t('app.unsavedHint');
    const choice = await invoke<UnsavedChoice>('show_unsaved_dialog', {
      title: t('common.unsavedChanges'),
      message,
      saveLabel: t('app.unsavedSave'),
      discardLabel: t('app.unsavedDiscard'),
      cancelLabel: t('app.unsavedCancel'),
    });
    if (choice === 'cancel') return false;
    if (choice === 'save') {
      try {
        await handleSaveFile(tab.id);
      } catch {
        // If save fails, abort the close so the user doesn't lose data
        return false;
      }
    }
    return true;
  }, [handleSaveFile, t]);

  const cleanupTab = useCallback((id: string) => {
    const pending = getPendingImages(id);
    for (const img of pending) {
      if (img.isTemp) {
        invoke('delete_file', { path: img.absolutePath }).catch(() => {});
      }
    }
    clearPendingImages(id);
  }, []);

  // F001 - Confirm close on unsaved changes; F013 - pinned tabs block normal close
  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isPinned) return;
    if (tab?.isDirty) {
      const shouldClose = await resolveUnsaved(tab);
      if (!shouldClose) return;
    }
    cleanupTab(id);
    closeTab(id);
  }, [tabs, closeTab, resolveUnsaved, cleanupTab]);

  const handleCloseOtherTabs = useCallback(async (keepTabId: string) => {
    const toClose: string[] = [];
    for (const tab of tabs) {
      if (tab.id === keepTabId) continue;
      if (tab.isPinned) continue;
      if (tab.isDirty) {
        const shouldClose = await resolveUnsaved(tab);
        if (!shouldClose) break;
      }
      toClose.push(tab.id);
    }
    toClose.forEach(cleanupTab);
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, resolveUnsaved, cleanupTab]);

  const handleCloseToLeft = useCallback(async (pivotTabId: string) => {
    const idx = tabs.findIndex(t => t.id === pivotTabId);
    const toClose: string[] = [];
    for (let i = 0; i < idx; i++) {
      const tab = tabs[i];
      if (tab.isPinned) continue;
      if (tab.isDirty) {
        const shouldClose = await resolveUnsaved(tab);
        if (!shouldClose) break;
      }
      toClose.push(tab.id);
    }
    toClose.forEach(cleanupTab);
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, resolveUnsaved, cleanupTab]);

  const handleCloseToRight = useCallback(async (pivotTabId: string) => {
    const idx = tabs.findIndex(t => t.id === pivotTabId);
    const toClose: string[] = [];
    for (let i = idx + 1; i < tabs.length; i++) {
      const tab = tabs[i];
      if (tab.isPinned) continue;
      if (tab.isDirty) {
        const shouldClose = await resolveUnsaved(tab);
        if (!shouldClose) break;
      }
      toClose.push(tab.id);
    }
    toClose.forEach(cleanupTab);
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, resolveUnsaved, cleanupTab]);

  const handleCloseAllTabs = useCallback(async () => {
    const unpinnedTabs = tabs.filter(t => !t.isPinned);
    const toClose: string[] = [];
    for (const tab of unpinnedTabs) {
      if (tab.isDirty) {
        const shouldClose = await resolveUnsaved(tab);
        if (!shouldClose) break;
      }
      toClose.push(tab.id);
    }
    toClose.forEach(cleanupTab);
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, resolveUnsaved, cleanupTab]);

  return {
    handleCloseTab, handleCloseAllTabs, handleCloseOtherTabs, handleCloseToLeft, handleCloseToRight,
    renamingTabId, setRenamingTabId,
    handleOpenSample,
  };
}

