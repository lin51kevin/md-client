import { useState, useEffect, useRef, useCallback } from 'react';
import { check as tauriCheck } from '@tauri-apps/plugin-updater';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export interface UseAutoUpgradeOptions {
  /** 是否启用自动检查 */
  enabled: boolean;
  /** 检查到更新后的回调 */
  onUpdateAvailable?: (info: UpdateInfo) => void;
  /** 下载进度回调 (0-100) */
  onDownloadProgress?: (percent: number) => void;
  /** 更新完成回调 */
  onUpdateReady?: () => void;
  /** 错误回调 */
  onError?: (error: string) => void;
}

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'marklite-last-update-check';

function shouldCheck(): boolean {
  try {
    const lastCheck = localStorage.getItem(STORAGE_KEY);
    if (!lastCheck) return true;
    return Date.now() - parseInt(lastCheck, 10) > CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

function recordCheck() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function useAutoUpgrade(options: UseAutoUpgradeOptions) {
  const { enabled, onUpdateAvailable, onDownloadProgress, onUpdateReady, onError } = options;
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const updateRef = useRef<any>(null); // the Tauri update object

  const checkForUpdate = useCallback(async () => {
    if (checking) return;
    if (!shouldCheck()) return;

    setChecking(true);
    try {
      const update = await tauriCheck();

      recordCheck();

      if (update) {
        const info: UpdateInfo = {
          version: update.version,
          releaseNotes: update.body,
        };
        setUpdateInfo(info);
        updateRef.current = update;
        onUpdateAvailable?.(info);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }, [checking, onUpdateAvailable, onError]);

  const downloadAndInstall = useCallback(async () => {
    if (!updateRef.current || downloading) return;
    setDownloading(true);
    try {
      await updateRef.current.downloadAndInstall((event: any) => {
        if (event.event === 'DownloadProgress' && event.progress) {
          const percent = Math.round(event.progress.fraction * 100);
          onDownloadProgress?.(percent);
        }
      });
      onUpdateReady?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }, [downloading, onDownloadProgress, onUpdateReady, onError]);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (enabled) {
      void checkForUpdate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { checkForUpdate, downloadAndInstall, checking, downloading, updateInfo };
}
