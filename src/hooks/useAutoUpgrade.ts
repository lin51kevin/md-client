import { useState, useEffect, useRef, useCallback } from 'react';
import { check as tauriCheck } from '@tauri-apps/plugin-updater';
import { StorageKeys } from '../lib/storage';
import { toErrorMessage } from '../lib/utils/errors';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export interface UseAutoUpgradeOptions {
  /** 是否启用自动检查 */
  enabled: boolean;
  /** 检查频率：每次启动('startup') 或每24小时('24h'，默认) */
  checkFrequency?: 'startup' | '24h';
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
const STORAGE_KEY = StorageKeys.LAST_UPDATE_CHECK;

function shouldCheck(frequency: 'startup' | '24h'): boolean {
  if (frequency === 'startup') return true;
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
  const { enabled, checkFrequency = '24h', onUpdateAvailable, onDownloadProgress, onUpdateReady, onError } = options;
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const updateRef = useRef<any>(null); // the Tauri update object
  const checkingRef = useRef(false);   // guard against concurrent calls
  const downloadingRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    if (!shouldCheck(checkFrequency)) return;

    checkingRef.current = true;
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
      onError?.(toErrorMessage(err));
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [onUpdateAvailable, onError, checkFrequency]);

  const downloadAndInstall = useCallback(async () => {
    if (!updateRef.current || downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    let contentLength = 0;
    let downloaded = 0;
    try {
      await updateRef.current.downloadAndInstall((event: any) => {
        if (event.event === 'Started') {
          contentLength = event.data?.contentLength ?? 0;
          onDownloadProgress?.(0);
        } else if (event.event === 'Progress') {
          downloaded += event.data?.chunkLength ?? 0;
          const percent = contentLength > 0
            ? Math.min(99, Math.round((downloaded / contentLength) * 100))
            : 0;
          onDownloadProgress?.(percent);
        }
      });
      onUpdateReady?.();
    } catch (err) {
      onError?.(toErrorMessage(err));
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  }, [onDownloadProgress, onUpdateReady, onError]);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (enabled) {
      void checkForUpdate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { checkForUpdate, downloadAndInstall, checking, downloading, updateInfo };
}
