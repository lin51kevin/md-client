/**
 * Resolves local image src attributes in an HTML string to base64 data URIs.
 *
 * When exporting HTML or generating PDF, images referenced by relative or
 * absolute file paths would be broken (file not found) because:
 * - HTML export is saved to a different location than the source document
 * - PDF generation loads HTML from a temp directory
 *
 * This module reads each local image via the Tauri read_file_bytes command
 * and replaces the src with an inline data URI so the export is self-contained.
 */

import { invoke } from '@tauri-apps/api/core';

/** Supported image MIME types keyed by lowercase extension */
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'image/png';
}

/**
 * Resolve a src value to an absolute path string, or null if not resolvable.
 * Handles absolute Windows paths (C:/...), Unix paths (/...), and relative paths.
 */
function toAbsPath(src: string, docDir: string | null): string | null {
  if (!src) return null;
  // Absolute Windows path: C:/ or C:\
  if (/^[a-zA-Z]:[/\\]/.test(src)) return src.replace(/\\/g, '/');
  // Absolute Unix path
  if (src.startsWith('/')) return src;
  // Relative path — needs a document directory as base
  if (!docDir) return null;
  const base = docDir.replace(/\\/g, '/').replace(/\/$/, '');
  const segments = `${base}/${src}`.split('/');
  const resolved: string[] = [];
  for (const seg of segments) {
    if (seg === '..') {
      if (resolved.length === 0) return null; // Path traversal beyond root
      resolved.pop();
    }
    else if (seg !== '.') resolved.push(seg);
  }
  const result = resolved.join('/');
  // Allow paths up to one level above docDir (parent of docDir) to support
  // "../image.jpg" patterns while still blocking deeper traversal (e.g. "../../etc/passwd").
  const normalizedBase = base.replace(/\/$/, '');
  const lastSlash = normalizedBase.lastIndexOf('/');
  const projectRoot = lastSlash > 0 ? normalizedBase.slice(0, lastSlash) : '';
  if (projectRoot && !result.startsWith(projectRoot + '/') && result !== projectRoot) return null;
  return result;
}

/** Convert a byte array to a base64 string without stack overflow for large files */
function bytesToBase64(bytes: number[]): string {
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.slice(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Extract the parent directory from a file path.
 * Returns null for null/empty paths.
 */
export function getDocDir(filePath: string | null): string | null {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.slice(0, lastSlash) : null;
}

/**
 * Replace all local `src="..."` attributes in an HTML string with inline
 * base64 data URIs by reading each file via the Tauri backend.
 *
 * Remote URLs (http/https/ftp) and existing data URIs are left untouched.
 * Files that cannot be read are silently skipped (src is preserved as-is).
 *
 * @param html        - Full HTML document or fragment string
 * @param documentPath - Absolute path of the source .md file (used to resolve
 *                       relative image paths). Pass null for unsaved documents.
 */
export async function resolveLocalImagesInHtml(
  html: string,
  documentPath: string | null,
): Promise<string> {
  const docDir = getDocDir(documentPath);

  // Collect unique local src values (only inside img tags)
  const localSrcs = new Set<string>();
  const IMG_SRC_RE = /<img\b[^>]*?\s+src\s*=\s*(["'])([^"'\s]+)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = IMG_SRC_RE.exec(html)) !== null) {
    const src = m[2];
    if (src && !/^(https?|ftp|data):/i.test(src)) {
      localSrcs.add(src);
    }
  }

  if (localSrcs.size === 0) return html;

  // Resolve each unique src to a data URI in parallel
  const srcToDataUri = new Map<string, string>();
  await Promise.all(
    Array.from(localSrcs).map(async (src) => {
      const absPath = toAbsPath(src, docDir);
      if (!absPath) return;
      try {
        const bytes = await invoke<number[]>('read_file_bytes', { path: absPath });
        if (!bytes || bytes.length === 0) return;
        const base64 = bytesToBase64(bytes);
        const mime = getMimeType(absPath);
        srcToDataUri.set(src, `data:${mime};base64,${base64}`);
      } catch {
        // File not found or permission denied — keep original src
      }
    }),
  );

  if (srcToDataUri.size === 0) return html;

  // Replace src attributes with resolved data URIs (handles both " and ')
  return html.replace(/<img\b([^>]*?)\s+src\s*=\s*(["'])([^"'\s]+)\2/gi, (full, before, quote, src) => {
    const dataUri = srcToDataUri.get(src);
    return dataUri ? `<img${before} src=${quote}${dataUri}${quote}` : full;
  });
}
