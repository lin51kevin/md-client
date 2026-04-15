import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import type { Tab } from '../types';
import type { TranslationKey } from '../i18n';
import { getPendingImages, clearPendingImages } from '../lib/pending-images';

interface UseTabActionsOptions {
  tabs: Tab[];
  closeTab: (id: string) => void;
  closeMultipleTabs: (ids: string[]) => void;
  setTabDisplayName: (id: string, name: string) => void;
  handleDismissWelcome: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function useTabActions({
  tabs, closeTab, closeMultipleTabs, setTabDisplayName, handleDismissWelcome, t,
}: UseTabActionsOptions) {
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);

  const handleOpenSample = useCallback(() => {
    setTabDisplayName(tabs[0].id, 'sample.md');
    handleDismissWelcome();
  }, [tabs, setTabDisplayName, handleDismissWelcome]);

  // F001 - Confirm close on unsaved changes; F013 - pinned tabs block normal close
  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isPinned) return;
    if (tab?.isDirty) {
      const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
      const path = tab.filePath ?? t('app.unsavedPath');
      const yes = await confirm(t('app.closeTabUnsaved', { name, path }), { title: t('app.closeTab'), kind: 'warning' });
      if (!yes) return;
    }
    // F014 — 清理临时目录中的待转存图片
    const pending = getPendingImages(id);
    for (const img of pending) {
      if (img.isTemp) {
        invoke('delete_file', { path: img.absolutePath }).catch(() => {});
      }
    }
    clearPendingImages(id);
    closeTab(id);
  }, [tabs, closeTab, t]);

  const handleCloseOtherTabs = useCallback(async (keepTabId: string) => {
    const toClose: string[] = [];
    for (const tab of tabs) {
      if (tab.id === keepTabId) continue;
      if (tab.isPinned) continue;
      if (tab.isDirty) {
        const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
        const path = tab.filePath ?? t('app.unsavedPath');
        const yes = await confirm(t('app.closeTabUnsaved', { name, path }), { title: t('app.closeTab'), kind: 'warning' });
        if (!yes) break;
      }
      toClose.push(tab.id);
    }
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, t]);

  const handleCloseToLeft = useCallback(async (pivotTabId: string) => {
    const idx = tabs.findIndex(t => t.id === pivotTabId);
    const toClose: string[] = [];
    for (let i = 0; i < idx; i++) {
      const tab = tabs[i];
      if (tab.isPinned) continue;
      if (tab.isDirty) {
        const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
        const path = tab.filePath ?? t('app.unsavedPath');
        const yes = await confirm(t('app.closeTabUnsaved', { name, path }), { title: t('app.closeTab'), kind: 'warning' });
        if (!yes) break;
      }
      toClose.push(tab.id);
    }
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, t]);

  const handleCloseToRight = useCallback(async (pivotTabId: string) => {
    const idx = tabs.findIndex(t => t.id === pivotTabId);
    const toClose: string[] = [];
    for (let i = idx + 1; i < tabs.length; i++) {
      const tab = tabs[i];
      if (tab.isPinned) continue;
      if (tab.isDirty) {
        const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
        const path = tab.filePath ?? t('app.unsavedPath');
        const yes = await confirm(t('app.closeTabUnsaved', { name, path }), { title: t('app.closeTab'), kind: 'warning' });
        if (!yes) break;
      }
      toClose.push(tab.id);
    }
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, t]);

  const handleCloseAllTabs = useCallback(async () => {
    const unpinnedTabs = tabs.filter(t => !t.isPinned);
    const toClose: string[] = [];
    for (const tab of unpinnedTabs) {
      if (tab.isDirty) {
        const name = tab.filePath?.split(/[\\/]/).pop() ?? 'Untitled.md';
        const path = tab.filePath ?? t('app.unsavedPath');
        const yes = await confirm(t('app.closeTabUnsaved', { name, path }), { title: t('app.closeTab'), kind: 'warning' });
        if (!yes) break;
      }
      toClose.push(tab.id);
    }
    if (toClose.length > 0) closeMultipleTabs(toClose);
  }, [tabs, closeMultipleTabs, t]);

  return {
    handleCloseTab, handleCloseAllTabs, handleCloseOtherTabs, handleCloseToLeft, handleCloseToRight,
    renamingTabId, setRenamingTabId,
    handleOpenSample,
  };
}
