import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/** 支持的图片扩展名 */
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp)$/i;

export type DragKind = 'file' | 'folder';

interface DragDropParams {
  isTauri: boolean;
  setIsDragOver: (v: boolean) => void;
  /** 设置当前拖拽内容的类型（文件 or 文件夹），用于 DragOverlay 展示 */
  setDragKind: (v: DragKind) => void;
  openFileInTab: (path: string) => Promise<void>;
  /** 处理拖入的图片（由 useImagePaste 提供）。Tauri 的 onDragDropEvent 拦截了原生
   *  drop 事件，导致 DOM dataTransfer.files 可能为空，因此需在此处理图片拖入。 */
  onImageDrop?: (ext: string, data: Uint8Array) => Promise<void>;
  /** 当拖入文件夹时，设置文件树根目录 */
  onFolderDrop?: (path: string) => void;
}

export function useDragDrop({ isTauri, setIsDragOver, setDragKind, openFileInTab, onImageDrop, onFolderDrop }: DragDropParams) {
  // Ref 让 Tauri 事件回调始终读到最新的 onImageDrop / onFolderDrop，无需重新订阅
  const onImageDropRef = useRef(onImageDrop);
  const onFolderDropRef = useRef(onFolderDrop);
  useEffect(() => { onImageDropRef.current = onImageDrop; });
  useEffect(() => { onFolderDropRef.current = onFolderDrop; });

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
          // Detect drag kind from paths in enter event
          if (type === 'enter') {
            const paths = (event.payload as { type: 'enter'; paths: string[] }).paths;
            if (paths && paths.length > 0) {
              // Check first path: if it has no file extension, likely a folder
              // We do async is_directory check for accuracy
              (async () => {
                try {
                  const isDir = await invoke<boolean>('is_directory', { path: paths[0] });
                  setDragKind(isDir ? 'folder' : 'file');
                } catch {
                  // Fallback: check if path has a file extension
                  setDragKind(/\.[^/\\]+$/.test(paths[0]) ? 'file' : 'folder');
                }
              })();
            }
          }
        } else if (type === 'drop') {
          setIsDragOver(false);
          const paths = (event.payload as { type: 'drop'; paths: string[] }).paths;

          // 打开 Markdown / 文本文件
          paths
            .filter(p => /\.(md|markdown|txt)$/i.test(p))
            .forEach(p => openFileInTab(p));

          // 检测并处理文件夹拖入
          const folderHandler = onFolderDropRef.current;
          if (folderHandler && paths.length > 0) {
            (async () => {
              for (const p of paths) {
                try {
                  const isDir = await invoke<boolean>('is_directory', { path: p });
                  if (isDir) {
                    folderHandler(p);
                    break; // 只处理第一个文件夹
                  }
                } catch (err) {
                  console.warn(`[useDragDrop] Failed to check directory: ${p}`, err);
                }
              }
            })();
          }

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
                  } catch (err) {
                    console.warn(`[useDragDrop] Failed to read image: ${imagePath}`, err);
                  }
                }
              })();
            }
          }
        } else {
          // leave / cancelled / any unknown type (e.g. drag cancelled via Escape)
          // — always hide overlay to prevent it getting stuck
          setIsDragOver(false);
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

    // Safety net: if the window loses focus while a drag is in progress
    // (e.g. Alt+Tab, Escape on Windows), Tauri may not fire leave/drop,
    // so we reset the overlay state on blur.
    const handleBlur = () => setIsDragOver(false);
    window.addEventListener('blur', handleBlur);

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
      window.removeEventListener('blur', handleBlur);
    };
  }, [isTauri, openFileInTab, setIsDragOver]);
}
