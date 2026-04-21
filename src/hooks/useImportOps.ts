/**
 * useImportOps — document import operations.
 *
 * Handles importing HTML files: converts HTML → Markdown via turndown,
 * then opens the result in a new tab.
 *
 * Files ≥ WORKER_THRESHOLD are converted in a Web Worker to keep the
 * UI responsive. Smaller files use the synchronous main-thread path.
 * Progress is reported via the Toast system.
 */
import { useState, useCallback, useRef } from 'react';
import { open, message, ask } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { TranslationKey } from '../i18n/zh-CN';
import { htmlToMarkdown, extractHtmlTitle } from '../lib/markdown/html-import';
import { convertHtmlInWorker } from '../lib/workers/html-import-bridge';
import type { ConvertProgress } from '../lib/workers/html-import-bridge';
import { toErrorMessage } from '../lib/utils/errors';
import { useToast } from '../components/toast/ToastContext';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** File size thresholds (bytes) */
const SIZE_WARN = 10 * 1024 * 1024;       // 10 MB
const SIZE_DANGER = 50 * 1024 * 1024;      // 50 MB
const SIZE_LIMIT = 200 * 1024 * 1024;      // 200 MB
/** Files above this size are converted in a Web Worker */
const WORKER_THRESHOLD = 2 * 1024 * 1024;  // 2 MB

interface ImportOpsParams {
  createNewTab: (initialContent?: string) => void;
  openFileWithContent?: (filePath: string, content: string, displayName?: string) => void;
  setTabDisplayName?: (id: string, name: string) => void;
  t?: TFn;
}

export function useImportOps({ createNewTab, openFileWithContent, t }: ImportOpsParams) {
  const tr = t ?? ((k: string) => k);
  const [importing, setImporting] = useState(false);
  const toast = useToast();
  const cancelRef = useRef<(() => void) | null>(null);

  /** Core import logic shared by dialog and drag-drop paths */
  const importFromPath = useCallback(async (filePath: string) => {
    setImporting(true);
    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;

    try {
      // Check file size before reading
      let fileSize = 0;
      try {
        fileSize = await invoke<number>('get_file_size', { path: filePath });
      } catch {
        // If get_file_size not available, proceed without size check
      }

      if (fileSize > SIZE_LIMIT) {
        await message(tr('fileOps.fileTooLarge'), { title: tr('fileOps.error'), kind: 'error' });
        return;
      }

      if (fileSize > SIZE_DANGER) {
        const sizeMB = Math.round(fileSize / 1024 / 1024);
        const proceed = await ask(tr('fileOps.veryLargeFileWarning', { size: sizeMB }), {
          title: tr('fileOps.hint'),
          kind: 'warning',
        });
        if (!proceed) return;
      } else if (fileSize > SIZE_WARN) {
        const sizeMB = Math.round(fileSize / 1024 / 1024);
        const proceed = await ask(tr('fileOps.largeFileWarning', { size: sizeMB }), {
          title: tr('fileOps.hint'),
          kind: 'warning',
        });
        if (!proceed) return;
      }

      // Read HTML content
      const htmlContent = await invoke<string>('read_file_text', { path: filePath });

      // Decide sync vs. Worker path based on content size
      const useWorker = htmlContent.length >= WORKER_THRESHOLD;

      let markdown: string;

      if (useWorker) {
        // Show progress toast for large files
        const toastId = toast.showProgress(tr('fileOps.importing', { name: fileName }));

        try {
          const stageLabels: Record<string, TranslationKey> = {
            stripping: 'fileOps.importProgress.stripping',
            converting: 'fileOps.importProgress.converting',
            done: 'fileOps.importProgress.done',
          };

          const onProgress = (p: ConvertProgress) => {
            const label = stageLabels[p.stage];
            toast.updateProgress(toastId, p.percent, label ? tr(label) : undefined);
          };

          const handle = convertHtmlInWorker(htmlContent, onProgress);
          cancelRef.current = () => {
            handle.cancel();
            toast.dismiss(toastId);
          };

          const result = await handle.promise;
          markdown = result.markdown;
          cancelRef.current = null;

          // Dismiss progress toast
          toast.dismiss(toastId);
        } catch (workerErr) {
          toast.dismiss(toastId);
          cancelRef.current = null;
          throw workerErr;
        }
      } else {
        // Small file: convert synchronously (fast, no overhead)
        markdown = htmlToMarkdown(htmlContent);
      }

      // Open in new tab with display name from HTML title
      const title = extractHtmlTitle(htmlContent);
      const displayName = title ? `${title}.md` : undefined;
      if (openFileWithContent && displayName) {
        openFileWithContent('', markdown, displayName);
      } else {
        createNewTab(markdown);
      }
    } catch (err) {
      const errMsg = toErrorMessage(err);
      await message(errMsg, { title: tr('fileOps.importFailed'), kind: 'error' });
    } finally {
      setImporting(false);
    }
  }, [createNewTab, tr, toast]);

  /** Import HTML via file dialog */
  const handleImportHtml = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;
      await importFromPath(filePath);
    } catch (err) {
      const errMsg = toErrorMessage(err);
      if (errMsg !== 'Cancelled' && errMsg !== '') {
        console.warn(`[useImportOps] importHtml error: ${errMsg}`);
      }
    }
  }, [importFromPath]);

  /** Import HTML from a known path (for drag-drop) */
  const handleImportHtmlFromPath = useCallback(async (path: string) => {
    await importFromPath(path);
  }, [importFromPath]);

  return {
    importing,
    handleImportHtml,
    handleImportHtmlFromPath,
  };
}
