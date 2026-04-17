/**
 * useUpdateNotification — state management for the app update flow.
 *
 * Wraps useAutoUpgrade and owns the toast visibility, download progress,
 * and restart-ready state so App.tsx doesn't need to declare them inline.
 */
import { useState } from 'react';
import { useAutoUpgrade } from './useAutoUpgrade';

interface UseUpdateNotificationParams {
  enabled: boolean;
  checkFrequency?: 'startup' | '24h';
}

export function useUpdateNotification({ enabled, checkFrequency }: UseUpdateNotificationParams) {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readyToRestart, setReadyToRestart] = useState(false);

  const { downloadAndInstall, updateInfo, downloading: isDownloading } = useAutoUpgrade({
    enabled,
    checkFrequency,
    onUpdateAvailable: () => setShowUpdateNotification(true),
    onDownloadProgress: setDownloadProgress,
    onUpdateReady: () => { setReadyToRestart(true); setDownloadProgress(100); },
    onError: (err) => console.warn('[AutoUpdate]', err),
  });

  return {
    showUpdateNotification,
    setShowUpdateNotification,
    downloadProgress,
    readyToRestart,
    downloadAndInstall,
    updateInfo,
    isDownloading,
  };
}
