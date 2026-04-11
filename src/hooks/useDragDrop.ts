import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/** 支持的图片扩展名 */
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp)$/i;

interface DragDropParams {
  isTauri: boolean;
  setIsDragOver: (v: boolean) => void;
  openFileInTab: (path: string) => Promise<void>;
  /** 处理拖入的图片（由 useImagePaste 提供）。Tauri 的 onDragDropEvent 拦截了原生
   *  drop 事件，导致 DOM dataTransfer.files 可能为空，因此需在此处理图片拖入。 */
  onImageDrop?: (ext: string, data: Uint8Array) => Promise<void>;
}

export function useDragDrop({ isTauri, setIsDragOver, openFileInTab, onImageDrop }: DragDropParams) {
  // Ref 让 Tauri 事件回调始终读到最新的 onImageDrop，无需重新订阅
  const onImageDropRef = useRef(onImageDrop);
  useEffect(() => { onImageDropRef.current = onImageDrop; });

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const webview = getCurrentWebview();
      const fn = await webview.onDragDropEvent((event) => {
        const { type } = event.payload;
        if (type === 'enter' || type === 'over') {
          setIsDragOver(true);
        } else if (type === 'leave') {
          setIsDragOver(false);
        } else if (type === 'drop') {
          setIsDragOver(false);
          const paths = (event.payload as { type: 'drop'; paths: string[] }).paths;

          // 打开 Markdown / 文本文件
          paths
            .filter(p => /\.(md|markdown|txt)$/i.test(p))
            .forEach(p => openFileInTab(p));

          // 处理图片文件：通过 read_file_bytes 读取内容，交给 saveAndInsert 保存并插入 Markdown
          const handler = onImageDropRef.current;
          if (handler) {
            const imagePaths = paths.filter(p => IMAGE_EXT_RE.test(p));
            if (imagePaths.length > 0) {
              (async () => {
                for (const imagePath of imagePaths) {
                  const ext = imagePath.split('.').pop()!.toLowerCase();
                  try {
                    const bytes = await invoke<number[]>('read_file_bytes', { path: imagePath });
                    await handler(ext, new Uint8Array(bytes));
                  } catch {
                    // 静默忽略无法读取的文件
                  }
                }
              })();
            }
          }
        }
      });
      // StrictMode 下 setup() 可能在 cleanup 之后才完成，需立即取消订阅
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    };

    setup();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [isTauri, openFileInTab]);
}
