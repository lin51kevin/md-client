/**
 * AppGlobalOverlays — renders all global overlays and floating UI that sits
 * outside the main layout hierarchy.
 *
 * Includes: CommandPalette, QuickOpen, SnippetPicker/Manager, UpdateNotification,
 * FileChangeToast, MindmapView, and the export loading indicator.
 *
 * Reads showCommandPalette, showQuickOpen, showUpdateNotification, viewMode
 * directly from Zustand stores to avoid prop drilling for visibility flags.
 */
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { invoke } from '@tauri-apps/api/core';
import type { Command } from '../lib/editor';
import type { RecentFile } from '../lib/file';
import type { TocEntry } from '../lib/markdown';
import type { FileChangeToast as FileChangeToastState } from '../hooks/useFileWatchState';
import type { Tab } from '../types';
import type { UpdateInfo } from '../hooks/useAutoUpgrade';
import { useUIStore, useEditorStore } from '../stores';
import { useI18n } from '../i18n';
const CommandPalette = lazy(() => import('./toolbar/CommandPalette').then(m => ({ default: m.CommandPalette })));
const QuickOpen = lazy(() => import('./toolbar/QuickOpen').then(m => ({ default: m.QuickOpen })));
import { SnippetPicker } from './modal/SnippetPicker';
import { SnippetManager } from './modal/SnippetManager';
import { FileChangeToast } from './editor/FileChangeToast';
import { UpdateNotification } from './modal/UpdateNotification';

const MindmapView = lazy(() => import('./preview/MindmapView').then(m => ({ default: m.MindmapView })));

export interface AppGlobalOverlaysProps {
  commandRegistry: Command[];
  locale: string;
  fileTreeRoot: string;
  recentFiles: RecentFile[];
  openFileInTab: (path: string) => Promise<void>;
  showSnippetPicker: boolean;
  setShowSnippetPicker: (v: boolean) => void;
  onSnippetInsert: (id: string, resolved: { text: string; cursorPosition: number | null }) => void;
  showSnippetManager: boolean;
  setShowSnippetManager: (v: boolean) => void;
  activeTabDoc: string;
  onTocNavigate: (entry: TocEntry) => void;
  fileChangeToast: FileChangeToastState | null;
  fileChangeTabs: Tab[];
  onReloadFile: (tabId: string, filePath: string) => void;
  onKeepFile: (tabId: string) => void;
  onSaveAsFile: (tabId?: string) => Promise<void>;
  onCloseToast: () => void;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  isDownloading: boolean;
  readyToRestart: boolean;
  onDownloadUpdate: () => void;
  onDismissUpdate: () => void;
  exporting: string | null;
}

export function AppGlobalOverlays({
  commandRegistry, locale,
  fileTreeRoot, recentFiles, openFileInTab,
  showSnippetPicker, setShowSnippetPicker, onSnippetInsert,
  showSnippetManager, setShowSnippetManager,
  activeTabDoc, onTocNavigate,
  fileChangeToast, fileChangeTabs, onReloadFile, onKeepFile, onSaveAsFile, onCloseToast,
  updateInfo, downloadProgress, isDownloading, readyToRestart, onDownloadUpdate, onDismissUpdate,
  exporting,
}: AppGlobalOverlaysProps) {
  const { t } = useI18n();

  const showCommandPalette = useUIStore((s) => s.showCommandPalette);
  const setShowCommandPalette = useUIStore((s) => s.setShowCommandPalette);
  const showQuickOpen = useUIStore((s) => s.showQuickOpen);
  const setShowQuickOpen = useUIStore((s) => s.setShowQuickOpen);
  const showUpdateNotification = useUIStore((s) => s.showUpdateNotification);
  const setShowUpdateNotification = useUIStore((s) => s.setShowUpdateNotification);
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  return (
    <>
      {exporting && (
        <div className="export-loading-indicator">
          <span className="export-spinner" />
          {t('fileOps.exporting', { format: exporting.toUpperCase() })}
        </div>
      )}

      {showUpdateNotification && updateInfo && (
        <div className="fixed bottom-8 right-4 z-10001">
          <UpdateNotification
            version={updateInfo.version}
            releaseNotes={updateInfo.releaseNotes}
            onDownload={onDownloadUpdate}
            onDismiss={() => { setShowUpdateNotification(false); onDismissUpdate(); }}
            downloadProgress={downloadProgress}
            downloading={isDownloading}
            readyToRestart={readyToRestart}
            onRestart={() => invoke('restart_app')}
          />
        </div>
      )}

      <Suspense fallback={null}>
      <CommandPalette
        visible={showCommandPalette}
        commands={commandRegistry}
        onClose={() => setShowCommandPalette(false)}
        locale={locale}
        t={t}
      />
      </Suspense>

      <Suspense fallback={null}>
      <QuickOpen
        visible={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
        onFileOpen={(path) => openFileInTab(path)}
        fileTreeRoot={fileTreeRoot}
        recentFiles={recentFiles}
      />
      </Suspense>

      <SnippetPicker
        visible={showSnippetPicker}
        onClose={() => setShowSnippetPicker(false)}
        onSelect={onSnippetInsert}
      />

      <SnippetManager
        visible={showSnippetManager}
        onClose={() => setShowSnippetManager(false)}
      />

      {fileChangeToast && (
        <FileChangeToast
          type={fileChangeToast.type}
          filePath={fileChangeToast.filePath}
          tabId={fileChangeToast.tabId}
          isDirty={fileChangeTabs.find(t => t.id === fileChangeToast.tabId)?.isDirty ?? false}
          onReload={(tabId) => { onReloadFile(tabId, fileChangeToast.filePath); onCloseToast(); }}
          onKeep={() => onKeepFile(fileChangeToast.tabId)}
          onSaveAs={(tabId) => { onSaveAsFile(tabId); onCloseToast(); }}
          onClose={onCloseToast}
        />
      )}

      {viewMode === 'mindmap' && (
        <Suspense fallback={<LoadingSpinner />}>
          <MindmapView markdown={activeTabDoc} onClose={() => setViewMode('split')} onNavigate={onTocNavigate} />
        </Suspense>
      )}
    </>
  );
}
