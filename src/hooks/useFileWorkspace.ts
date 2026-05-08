/**
 * useFileWorkspace — aggregates file workspace hooks for AppShell.
 *
 * Combines tab management, file operations, file watching, recent files,
 * tab actions, and pending image migration into a single cohesive hook.
 */
import { useRef } from 'react';
import type { TranslationKey } from '../i18n';
import { useTabs } from './useTabs';
import { useFileOps } from './useFileOps';
import { useFileWatchState } from './useFileWatchState';
import { useRecentFiles } from './useRecentFiles';
import { useTabActions } from './useTabActions';
import { usePendingImageMigration } from './usePendingImageMigration';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export interface UseFileWorkspaceParams {
  t: TFn;
  fileWatch: boolean;
  fileWatchBehavior: boolean;
  handleDismissWelcome: () => void;
}

export function useFileWorkspace({ t, fileWatch, fileWatchBehavior, handleDismissWelcome }: UseFileWorkspaceParams) {
  // Ref to bridge useTabs ↔ useRecentFiles circular dependency:
  // useTabs needs a refresh callback, but useRecentFiles needs openFileInTab from useTabs.
  const refreshRecentRef = useRef<() => void>(() => {});

  // ── Tabs ─────────────────────────────────────────────────────────
  const tabsResult = useTabs(t, () => refreshRecentRef.current());

  // ── Recent files ─────────────────────────────────────────────────
  const recentFilesHook = useRecentFiles({ openFileInTab: tabsResult.openFileInTab });
  refreshRecentRef.current = recentFilesHook.refreshRecentFiles;

  // ── Pending image migration ──────────────────────────────────────
  const { handleFirstSave } = usePendingImageMigration({
    tabs: tabsResult.tabs,
    updateTabDoc: tabsResult.updateTabDoc,
    markSaved: tabsResult.markSaved,
  });

  // ── File operations ──────────────────────────────────────────────
  const fileOpsResult = useFileOps({
    getActiveTab: tabsResult.getActiveTab,
    tabs: tabsResult.tabs,
    resolveTabDoc: tabsResult.resolveTabDoc,
    openFileInTab: tabsResult.openFileInTab,
    markSaved: tabsResult.markSaved,
    markSavedAs: tabsResult.markSavedAs,
    t,
    onFirstSave: handleFirstSave,
    updateTab: tabsResult.updateTab,
  });
  const { handleSaveFile: rawHandleSaveFile, ...restFileOps } = fileOpsResult;

  // ── File watch state ────────────────────────────────────────────
  const watchStateResult = useFileWatchState({
    tabs: tabsResult.tabs,
    enabled: fileWatch,
    autoReload: fileWatchBehavior,
    updateTab: tabsResult.updateTab,
  });

  // ── Tab actions ──────────────────────────────────────────────────
  const tabActionsResult = useTabActions({
    tabs: tabsResult.tabs,
    closeTab: tabsResult.closeTab,
    closeMultipleTabs: tabsResult.closeMultipleTabs,
    setTabDisplayName: tabsResult.setTabDisplayName,
    handleDismissWelcome,
    t,
    handleSaveFile: fileOpsResult.handleSaveFile,
  });

  return {
    ...tabsResult,
    ...restFileOps,
    rawHandleSaveFile,
    ...watchStateResult,
    recentFiles: recentFilesHook.recentFiles,
    handleOpenRecent: recentFilesHook.handleOpenRecent,
    handleClearRecent: recentFilesHook.handleClearRecent,
    handleRemoveRecent: recentFilesHook.handleRemoveRecent,
    refreshRecentFiles: recentFilesHook.refreshRecentFiles,
    ...tabActionsResult,
    handleFirstSave,
  };
}
