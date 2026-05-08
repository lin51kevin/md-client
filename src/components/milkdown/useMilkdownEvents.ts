import { useEffect } from 'react';
import { replaceAll, insert } from '@milkdown/kit/utils';
import { commandsCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import GithubSlugger from 'github-slugger';
import type { RefObject } from 'react';
import { resolvePath } from '../../lib/utils/path';

/**
 * Event effects for the Milkdown editor:
 * - User interaction detection
 * - Anchor link navigation
 * - Link click delegation (wiki-links + file links)
 * - Context menu insert handler (table/image)
 * - Content sync (external → Milkdown)
 * - Editable state sync
 */
export function useMilkdownEvents(
  crepeRef: RefObject<Crepe | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  isExternalUpdate: RefObject<boolean>,
  hasUserInteractedRef: RefObject<boolean>,
  lastContentRef: RefObject<string>,
  filePath: string | undefined,
  editable: boolean,
  onWikiLinkNavigate: ((target: string) => void) | undefined,
  onOpenFile: ((path: string) => void) | undefined,
) {
  // Detect real user interaction
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onInteract = () => { hasUserInteractedRef.current = true; };
    container.addEventListener('keydown', onInteract, true);
    container.addEventListener('compositionstart', onInteract, true);
    return () => {
      container.removeEventListener('keydown', onInteract, true);
      container.removeEventListener('compositionstart', onInteract, true);
    };
  }, []);

  // In-document anchor link navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const anchor = el.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      if (!href.startsWith('#') || href.length <= 1) return;

      e.preventDefault();
      e.stopPropagation();

      const fragment = decodeURIComponent(href.slice(1));
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const slugger = new GithubSlugger();

      for (const heading of headings) {
        const text = (heading as HTMLElement).textContent ?? '';
        const slug = slugger.slug(text);
        if (slug === fragment) {
          (heading as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
    };

    container.addEventListener('click', handler, true);
    return () => container.removeEventListener('click', handler, true);
  }, []);

  // Link click delegation (wiki-links + markdown file links)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;

      const wikiLink = el.closest('.wiki-link');
      if (wikiLink) {
        e.preventDefault();
        const wikiTarget = wikiLink.getAttribute('data-wiki-target');
        if (wikiTarget) onWikiLinkNavigate?.(wikiTarget);
        return;
      }

      const anchor = el.closest('a[href]') as HTMLAnchorElement | null;
      if (anchor) {
        const href = anchor.getAttribute('href') ?? '';
        if (href && !/^https?:|^mailto:|^#/i.test(href)) {
          e.preventDefault();
          const absPath = filePath ? resolvePath(filePath, href) : href;
          onOpenFile?.(absPath);
        }
      }
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [containerRef, onWikiLinkNavigate, onOpenFile, filePath]);

  // Context menu: insert-table and insert-image
  useEffect(() => {
    const handler = async (e: Event) => {
      const { action } = (e as CustomEvent<{ action: 'insert-table' | 'insert-image' }>).detail;
      const crepe = crepeRef.current;
      if (!crepe) return;

      if (action === 'insert-table') {
        hasUserInteractedRef.current = true;
        try {
          const { insertTableCommand } = await import('@milkdown/preset-gfm');
          const commands = crepe.editor.ctx.get(commandsCtx);
          commands.call(insertTableCommand.key, { row: 3, col: 3 });
        } catch (err) {
          console.warn('[milkdown] insertTableCommand failed:', err);
        }
        return;
      }

      if (action === 'insert-image') {
        try {
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selected = await open({
            multiple: false,
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }],
          });
          if (!selected) return;

          const selectedPath = selected as string;
          const ext = selectedPath.split('.').pop()?.toLowerCase() ?? 'png';
          const { invoke } = await import('@tauri-apps/api/core');
          const imageBytes = await invoke<number[]>('read_file_bytes', { path: selectedPath });
          const data = new Uint8Array(imageBytes);
          const { generateImageFileName, getImageSaveDir, buildImageMarkdownPath } = await import('../../lib/utils');

          hasUserInteractedRef.current = true;

          const fileName = generateImageFileName(ext);
          const saveDir = getImageSaveDir();
          let actualDir = saveDir;

          if (!actualDir && filePath) {
            const sepIdx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
            actualDir = filePath.substring(0, sepIdx + 1) + 'assets/images';
          }

          if (!actualDir) {
            const mdText = `\n![](${selectedPath})\n`;
            crepe.editor.action(insert(mdText));
            return;
          }

          const savePath = `${actualDir}/${fileName}`;
          await invoke('write_image_bytes', { path: savePath, data: Array.from(data) });

          const mdPath = buildImageMarkdownPath(actualDir, fileName, filePath ?? undefined);
          const mdText = `\n![](${mdPath})\n`;
          crepe.editor.action(insert(mdText));
        } catch (err) {
          console.warn('[milkdown] insert-image failed:', err);
        }
      }
    };

    document.addEventListener('milkdown-preview-insert', handler);
    return () => document.removeEventListener('milkdown-preview-insert', handler);
  }, [filePath]);

  // Handle editable changes
  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    crepe.setReadonly(!editable);
  }, [editable]);

  return {
    /** Call in a useEffect to sync external content changes → Milkdown */
    syncContent(body: string, getEditor: () => any) {
      const crepe = crepeRef.current;
      const editor = getEditor();
      if (!crepe || !editor) return;

      if (body.trim() === lastContentRef.current.trim()) return;
      if (hasUserInteractedRef.current) return;

      isExternalUpdate.current = true;
      editor.action(replaceAll(body));
      lastContentRef.current = body;
      queueMicrotask(() => {
        isExternalUpdate.current = false;
      });
    },
  };
}
