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
