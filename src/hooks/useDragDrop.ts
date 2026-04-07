import { useEffect } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

interface DragDropParams {
  isTauri: boolean;
  setIsDragOver: (v: boolean) => void;
  openFileInTab: (path: string) => Promise<void>;
}

export function useDragDrop({ isTauri, setIsDragOver, openFileInTab }: DragDropParams) {
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent((event) => {
        const { type } = event.payload;
        if (type === 'enter' || type === 'over') {
          setIsDragOver(true);
        } else if (type === 'leave') {
          setIsDragOver(false);
        } else if (type === 'drop') {
          setIsDragOver(false);
          const paths = (event.payload as { type: 'drop'; paths: string[] }).paths;
          paths
            .filter(p => /\.(md|markdown|txt)$/i.test(p))
            .forEach(p => openFileInTab(p));
        }
      });
    };

    setup();
    return () => { if (unlisten) unlisten(); };
  }, [isTauri, openFileInTab]);
}
