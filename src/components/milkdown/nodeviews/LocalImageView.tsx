/**
 * LocalImage — Post-processing hook for MilkdownPreview.
 *
 * Scans the Milkdown DOM for <img> elements with local paths (non-http/data/blob)
 * and replaces their src with base64 data URLs via Tauri fs.readFile.
 *
 * Processes images when content or filePath changes — no MutationObserver needed
 * since Milkdown DOM updates are driven by content changes we already track.
 */

import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

const MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

const MAX_CACHE = 100;
const imageCache = new Map<string, string>();

function cacheSet(key: string, value: string): void {
  if (imageCache.has(key)) imageCache.delete(key);
  imageCache.set(key, value);
  if (imageCache.size > MAX_CACHE) {
    const oldest = imageCache.keys().next().value;
    if (oldest !== undefined) imageCache.delete(oldest);
  }
}

function isAbsolutePath(p: string): boolean {
  if (p.startsWith('/')) return true;
  if (/^[a-zA-Z]:[/\\]/.test(p)) return true;
  return false;
}

function resolvePath(docFilePath: string, rel: string): string {
  if (isAbsolutePath(rel)) return rel;
  const dir = docFilePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
  const parts = (dir + '/' + rel.replace(/\\/g, '/')).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return resolved.join('/');
}

function isLocalPath(src: string): boolean {
  if (!src) return false;
  return !/^https?:|^data:|^blob:/i.test(src) && !src.startsWith('#');
}

async function loadImage(absPath: string, img: HTMLImageElement): Promise<void> {
  const cached = imageCache.get(absPath);
  if (cached !== undefined) {
    if (cached) img.src = cached;
    return;
  }

  try {
    const numArray = await invoke<number[]>('read_file_bytes', { path: absPath });
    const bytes = new Uint8Array(numArray);
    const ext = absPath.split('.').pop()?.toLowerCase() ?? '';
    const mime = MIME_MAP[ext] ?? 'image/png';
    let binary = '';
    const CHUNK = 32768;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const dataUrl = `data:${mime};base64,${btoa(binary)}`;
    cacheSet(absPath, dataUrl);
    img.src = dataUrl;
  } catch {
    cacheSet(absPath, '');
    // Leave broken image placeholder
  }
}

export function useLocalImage(
  docFilePath: string | undefined,
  containerRef: React.RefObject<HTMLElement | null>,
  content: string
) {
  const processedRef = useRef(new Set<string>());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !docFilePath) return;

    // Use rAF to avoid layout thrashing — Milkdown may have just updated the DOM
    requestAnimationFrame(() => {
      const images = container.querySelectorAll<HTMLImageElement>('img[src]');
      images.forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (!isLocalPath(src)) return;
        if (processedRef.current.has(src)) return;

        processedRef.current.add(src);
        const absPath = resolvePath(docFilePath, src);
        void loadImage(absPath, img);
      });
    });
  }, [docFilePath, content, containerRef]);

  // Clear processed cache when content changes so new local images get picked up
  useEffect(() => {
    processedRef.current.clear();
  }, [content]);
}
