import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Tab } from '../types';
import { getPendingImages, clearPendingImages } from '../lib/pending-images';
import { buildImageMarkdownPath } from '../lib/image-paste';

interface UsePendingImageMigrationOptions {
  tabs: Tab[];
  updateTabDoc: (tabId: string, value: string) => void;
  markSaved: (id: string) => void;
}

export function usePendingImageMigration({ tabs, updateTabDoc, markSaved }: UsePendingImageMigrationOptions) {
  // F014 — 首次保存时转存待处理图片：绝对路径 → 相对路径
  const handleFirstSave = useCallback(async (tabId: string, savedPath: string) => {
    const pending = getPendingImages(tabId);
    if (pending.length === 0) return;

    const sepIdx = Math.max(savedPath.lastIndexOf('/'), savedPath.lastIndexOf('\\'));
    const docDir = savedPath.substring(0, sepIdx);
    const targetDir = `${docDir}/assets/images`;

    const tab = tabs.find(t => t.id === tabId);
    if (!tab) { clearPendingImages(tabId); return; }

    let content = tab.doc;

    for (const img of pending) {
      const targetPath = `${targetDir}/${img.fileName}`;
      try {
        const bytes = await invoke<number[]>('read_file_bytes', { path: img.absolutePath });
        await invoke('write_image_bytes', { path: targetPath, data: bytes });

        const relPath = buildImageMarkdownPath(targetDir, img.fileName, savedPath);
        content = content.split(img.absolutePath).join(relPath);

        if (img.isTemp) {
          invoke('delete_file', { path: img.absolutePath }).catch(() => {});
        }
      } catch {
        // 复制失败则保留原路径不变
      }
    }

    clearPendingImages(tabId);

    if (content !== tab.doc) {
      updateTabDoc(tabId, content);
      try {
        await invoke('write_file_text', { path: savedPath, content });
        markSaved(tabId);
      } catch {
        // 重新保存失败时不阻塞
      }
    }
  }, [tabs, updateTabDoc, markSaved]);

  return { handleFirstSave };
}
