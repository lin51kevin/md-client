/**
 * useAppFileHandlers — consolidated file operations for AppShell.
 *
 * Combines useFileOps, useImportOps, useVersionHistory, and useFileWatchState
 * into a single hook, returning only the handlers and state that AppShell needs.
 */
import type { Tab } from '../types';
import { useFileOps } from './useFileOps';
import { useImportOps } from './useImportOps';
import { useVersionHistory } from './useVersionHistory';
import { useFileWatchState } from './useFileWatchState';
import { usePendingImageMigration } from './usePendingImageMigration';
import { restoreSnapshot } from '../lib/storage/version-history';

interface UseAppFileHandlersParams {
  getActiveTab: () => Tab;
  tabs: Tab[];
  resolveTabDoc: (tabId: string) => string;
  openFileInTab: (path: string) => Promise<void>;
  openFileWithContent: (path: string, content: string, displayName?: string) => Promise<void>;
  createNewTab: (content?: string) => Promise<void>;
  markSaved: (id: string) => void;
  markSavedAs: (id: string, filePath: string) => void;
  updateTabDoc: (tabId: string, doc: string) => void;
  updateTab: (tabId: string, patch: Partial<Tab>) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export interface UseAppFileHandlersResult {
  // File operations
  handleOpenFile: () => Promise<void>;
  /** Raw save (bypasses version history) — used by editor core for auto-save */
  rawHandleSaveFile: (tabId?: string) => Promise<void>;
  /** Version-history-aware save — used by toolbar/keyboard shortcuts */
  handleSaveFile: (tabId?: string) => Promise<void>;
  handleSaveAsFile: (tabId?: string) => Promise<void>;
  handleExportDocx: () => Promise<void>;
  handleExportPdf: () => Promise<void>;
  handleExportHtml: () => Promise<void>;
  handleExportEpub: () => Promise<void>;
  handleExportPng: (target: HTMLElement | null) => Promise<void>;
  exporting: string | null;

  // Import
  handleImportHtml: () => Promise<void>;
  handleImportHtmlFromPath: (path: string) => Promise<void>;

  // Version history
  snapshots: ReturnType<typeof useVersionHistory>['snapshots'];
  handleVersionHistorySave: ReturnType<typeof useVersionHistory>['handleSaveFile'];
  restoreSnapshot: (filePath: string, id: string) => string | null;

  // File watcher
  fileChangeToast: ReturnType<typeof useFileWatchState>['fileChangeToast'];
  setFileChangeToast: ReturnType<typeof useFileWatchState>['setFileChangeToast'];
  handleReloadFile: (tabId: string, filePath: string) => Promise<void>;
  handleKeepFile: (tabId: string) => void;
}

export function useAppFileHandlers({
  getActiveTab, tabs, resolveTabDoc, openFileInTab, openFileWithContent,
  createNewTab, markSaved, markSavedAs, updateTabDoc, updateTab, t,
}: UseAppFileHandlersParams): UseAppFileHandlersResult {
  const { handleFirstSave } = usePendingImageMigration({ tabs, updateTabDoc, markSaved });

  const {
    handleOpenFile, handleSaveFile: rawHandleSaveFile, handleSaveAsFile,
    handleExportDocx, handleExportPdf, handleExportHtml, handleExportEpub,
    handleExportPng, exporting,
  } = useFileOps({
    getActiveTab, tabs, resolveTabDoc, openFileInTab, markSaved, markSavedAs, t,
    updateTab, onFirstSave: handleFirstSave,
  });

  const { handleImportHtml, handleImportHtmlFromPath } = useImportOps({
    createNewTab, openFileWithContent, t,
  });

  const { snapshots, handleSaveFile: versionHistoryHandleSave } = useVersionHistory({
    rawHandleSaveFile, getActiveTab, tabs,
    activeFilePath: getActiveTab().filePath,
  });

  const { fileChangeToast, setFileChangeToast, handleReloadFile, handleKeepFile } =
    useFileWatchState({ tabs, enabled: true, autoReload: true, updateTab });

  return {
    handleOpenFile,
    rawHandleSaveFile,
    handleSaveFile: versionHistoryHandleSave,
    handleSaveAsFile,
    handleExportDocx, handleExportPdf, handleExportHtml, handleExportEpub,
    handleExportPng, exporting,
    handleImportHtml, handleImportHtmlFromPath,
    snapshots,
    handleVersionHistorySave: versionHistoryHandleSave,
    restoreSnapshot,
    fileChangeToast, setFileChangeToast, handleReloadFile, handleKeepFile,
  };
}
