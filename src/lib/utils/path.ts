/** Cross-platform path utilities */

/**
 * Normalize path separators to forward slashes for consistent cross-platform
 * path comparison. Collapses consecutive separators.
 */
export function normalizePath(p: string): string {
  return p.replace(/[\\/]+/g, '/');
}

/**
 * Check whether a path is absolute on Windows (C:/...) or Unix (/...).
 */
export function isAbsolutePath(p: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('/');
}

/**
 * Resolve a relative path against a document file path.
 * If `rel` is already absolute it is returned as-is.
 * Uses the directory of `docFilePath` as the base.
 */
export function resolvePath(docFilePath: string, rel: string): string {
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
