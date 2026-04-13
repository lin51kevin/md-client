import { useEffect, type MutableRefObject } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import type { Tab } from '../types';
import type { TranslationKey } from '../i18n';

interface UseAppLifecycleOptions {
  isTauri: boolean;
  openFileWithContent: (filePath: string, content: string) => void;
  tabsRef: MutableRefObject<Tab[]>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function useAppLifecycle({ isTauri, openFileWithContent, tabsRef, t }: UseAppLifecycleOptions) {
  // CLI file open (double-click from file explorer)
  useEffect(() => {
    if (!isTauri) return;
    invoke<{ path: string; content: string } | null>('get_open_file')
      .then((result) => { if (result) openFileWithContent(result.path, result.content); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single-instance: listen for "open-file" event from second instance
  useEffect(() => {
    if (!isTauri) return;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('open-file', async (event: { payload: string }) => {
          const filePath = event.payload;
          try {
            const content = await invoke<string>('read_file_text', { path: filePath });
            openFileWithContent(filePath, content);
            const window = getCurrentWindow();
            await window.unminimize();
            await window.setFocus();
          } catch (err) {
            console.error('Failed to open file from second instance:', err);
          }
        });
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Window close confirmation for unsaved changes
  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { listen } = await import('@tauri-apps/api/event');
      if (cancelled) return;

      const fn = await listen('tauri://close-requested', async () => {
        const dirtyTabs = tabsRef.current.filter(tab => tab.isDirty);

        if (dirtyTabs.length > 0) {
          const shouldClose = await confirm(
            t('common.unsavedChangesMessage', { count: dirtyTabs.length }),
            { title: t('common.unsavedChanges'), kind: 'warning' }
          );
          if (!shouldClose) return;
        }

        const win = getCurrentWindow();
        await win.destroy();
      });

      if (cancelled) fn(); else unlisten = fn;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [isTauri]); // tabsRef is a stable ref; t is stable for the app lifetime
}
