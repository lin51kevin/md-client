/**
 * F014 — 图片粘贴与拖拽插入 Hook
 *
 * 监听编辑器容器的 paste 和 drop 事件：
 * - paste: 检测剪贴板中的图片数据，写入磁盘，插入 Markdown
 * - drop:  检测拖入的图片文件，写入磁盘，插入 Markdown
 *
 * 依赖：
 * - image-paste.ts: 工具函数
 * - Tauri invoke: 调用 Rust 命令保存文件
 * - CodeMirror: 插入文本到光标位置（通过回调）
 */

import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getImageSaveDir, generateImageFileName, buildImageMarkdownPath } from '../lib/image-paste';

export interface ImagePasteOptions {
  /** 当前 Markdown 文档路径（用于计算相对路径） */
  docPath?: string | null;
  /** 插入 Markdown 图片语法到编辑器 */
  insertText: (markdown: string) => void;
  /** 当前编辑器内容 */
  content: string;
  /** 是否启用（可由 Toolbar 开关控制） */
  enabled?: boolean;
}

/** 支持的图片 MIME 类型 */
const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function getImageExt(mime: string): string | null {
  return SUPPORTED_IMAGE_TYPES[mime] ?? null;
}

function isImageMime(mime: string): boolean {
  return mime in SUPPORTED_IMAGE_TYPES;
}

/**
 * 尝试从 DataTransferItem 读取图片数据
 */
async function readImageFromItem(item: DataTransferItem): Promise<{ ext: string; data: Uint8Array } | null> {
  if (!item.kind === 'file') return null;

  // 优先使用 getAsFile（图片拖入浏览器时）
  const file = item.getAsFile();
  if (!file) return null;

  const ext = getImageExt(file.type);
  if (!ext) return null;

  const buffer = await file.arrayBuffer();
  return { ext, data: new Uint8Array(buffer) };
}

export function useImagePaste({
  docPath,
  insertText,
  content,
  enabled = true,
}: ImagePasteOptions) {
  const containerRef = useRef<HTMLElement | null>(null);

  const saveAndInsert = useCallback(
    async (ext: string, data: Uint8Array) => {
      const fileName = generateImageFileName(ext);
      const saveDir = getImageSaveDir();

      // 确定实际保存目录
      // 如果没有设置保存目录，且有 docPath → 使用 doc 所在目录 + "assets/images/"
      // 否则使用设置的目录或当前目录
      let actualDir = saveDir;
      if (!actualDir && docPath) {
        const sepIdx = Math.max(docPath!.lastIndexOf('/'), docPath!.lastIndexOf('\\'));
        const docDir = docPath!.substring(0, sepIdx + 1);
        actualDir = docDir + 'assets' + '/' + 'images';
      }

      const savePath = actualDir ? `${actualDir}/${fileName}` : fileName;

      // 调用 Rust 命令写入文件
      try {
        await invoke('write_image_bytes', { path: savePath, data: Array.from(data) });
      } catch (err) {
        console.error('[useImagePaste] failed to save image:', err);
        return;
      }

      // 构建 Markdown 图片路径
      const mdPath = buildImageMarkdownPath(actualDir, fileName, docPath ?? undefined);
      insertText(`\n![](${mdPath})\n`);
    },
    [docPath, insertText],
  );

  // Paste 事件处理
  useEffect(() => {
    if (!enabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      for (const item of items) {
        if (!isImageMime(item.type)) continue;
        e.preventDefault(); // 阻止默认粘贴行为

        const result = await readImageFromItem(item);
        if (result) {
          await saveAndInsert(result.ext, result.data);
          return;
        }
      }
    };

    document.addEventListener('paste', handlePaste, true);
    return () => document.removeEventListener('paste', handlePaste, true);
  }, [enabled, saveAndInsert]);

  // Drag & Drop 事件处理
  useEffect(() => {
    if (!enabled) return;

    const handleDragOver = (e: DragEvent) => {
      // 检查是否有图片被拖入
      const hasImage = Array.from(e.dataTransfer?.items ?? []).some(
        (item) => item.kind === 'file' && isImageMime(item.type),
      );
      if (hasImage) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      const items = Array.from(e.dataTransfer?.files ?? []);
      for (const file of items) {
        if (!isImageMime(file.type)) continue;
        e.preventDefault();

        const ext = getImageExt(file.type)!;
        const data = new Uint8Array(await file.arrayBuffer());
        await saveAndInsert(ext, data);
        return;
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [enabled, saveAndInsert]);
}
