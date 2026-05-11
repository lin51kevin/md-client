/**
 * Terminal path utility functions.
 * Extracted from TerminalInstance.tsx to enable unit testing.
 */

/**
 * Convert a Unix-style git-bash absolute path (/f/some/dir) to a
 * Windows native path (F:\some\dir) when the current cwd is Windows-style.
 * Leaves non-Unix and non-Windows-cwd paths unchanged.
 */
export const toNativePath = (path: string, cwd: string): string => {
  // Only convert when running on a Windows cwd (e.g. F:/md-client)
  if (!/^[A-Za-z]:/.test(cwd)) return path;

  // Match /letter or /letter/rest  (git-bash drive notation)
  const m = path.match(/^\/([a-zA-Z])(\/.*)?$/);
  if (m) {
    const drive = m[1].toUpperCase();
    const rest = (m[2] ?? '').replace(/\//g, '\\');
    return rest ? `${drive}:${rest}` : `${drive}:\\`;
  }
  return path;
};

/**
 * Resolve a target path relative to the current cwd.
 * Handles ~, relative paths and absolute paths (Windows and Unix-style).
 * Note: call toNativePath on the target BEFORE this if the shell uses
 * Unix-style absolute paths (bash/git-bash on Windows).
 */
export const resolvePath = (target: string, cwd: string): string => {
  // Normalise separators for internal processing
  const norm = (p: string) => p.replace(/\\/g, '/');

  // Handle ~ (home — use drive:\Users on Windows, root otherwise)
  if (target === '~' || target.startsWith('~/') || target.startsWith('~\\')) {
    const driveMatch = cwd.match(/^([A-Za-z]:)/);
    const homeRoot = driveMatch ? `${driveMatch[1]}\\Users` : '/';
    return target === '~' ? homeRoot : homeRoot + '/' + target.slice(2);
  }

  const normalizedTarget = norm(target);

  // Absolute path (Windows C:\… or Unix /…)
  if (/^[A-Za-z]:/.test(normalizedTarget) || normalizedTarget.startsWith('/')) {
    return target;
  }

  // Relative path — join with cwd and resolve . / ..
  const base = norm(cwd);
  const combined = base.endsWith('/') ? base + normalizedTarget : base + '/' + normalizedTarget;

  const parts = combined.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') {
      if (resolved.length === 0) resolved.push('');
      continue;
    }
    if (part === '..') {
      if (resolved.length > 1) resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  let result = resolved.join('/');
  // Ensure Windows drive root ends with separator (e.g. "C:" → "C:/")
  if (/^[A-Za-z]:$/.test(result)) result += '/';

  return result;
};

/**
 * Extract the cd target from a command string.
 * Returns null when the command is not a directory-change command.
 * Handles: cd path, cd "path with spaces", cd /d path, chdir, D: (drive switch)
 */
export const extractCdTarget = (cmd: string): string | null => {
  const trimmed = cmd.trim();

  // Windows drive switch: single letter followed by colon, e.g. "D:"
  if (/^[A-Za-z]:[\\/]?$/.test(trimmed)) {
    return trimmed.endsWith('\\') || trimmed.endsWith('/') ? trimmed : trimmed + '\\';
  }

  // cd or chdir with optional /d flag (cmd.exe)
  const cdMatch = trimmed.match(/^(?:cd|chdir)(?:\s+\/[dD])?\s+(.+)$/i);
  if (!cdMatch) return null;

  let target = cdMatch[1].trim();

  // Strip surrounding quotes
  if (
    (target.startsWith('"') && target.endsWith('"')) ||
    (target.startsWith("'") && target.endsWith("'"))
  ) {
    target = target.slice(1, -1);
  }

  return target;
};

/**
 * Build the display name for a completion entry.
 * For a partial like "/f/", returns just the basename + sep so the listing
 * is clean (matching real bash tab-completion behaviour).
 */
export const buildCompletionDisplayName = (
  entryName: string,
  isDir: boolean,
  sep: string,
): string => {
  return entryName + (isDir ? sep : '');
};

/**
 * Build the full completion string (replaces the partial in the input buffer).
 * Preserves any directory prefix the user already typed (e.g. "/f/").
 */
export const buildCompletionFullName = (
  entryName: string,
  isDir: boolean,
  partial: string,
  sep: string,
): string => {
  const partialDir =
    partial.includes('/') || partial.includes('\\')
      ? partial.slice(0, Math.max(partial.lastIndexOf('/'), partial.lastIndexOf('\\')) + 1)
      : '';
  const name = partialDir + entryName + (isDir ? sep : '');
  return name.includes(' ') ? `"${name}"` : name;
};
