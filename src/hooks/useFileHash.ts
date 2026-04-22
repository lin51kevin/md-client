/**
 * useFileHash — tracks content hashes for open files to detect external modifications.
 *
 * When a file is opened or saved, we store its content MD5 hash.
 * Before saving, we compare the current disk content hash against the stored one.
 * If they differ, an external program has modified the file since our last read/save.
 */
import { invoke } from '@tauri-apps/api/core';

const hashStore = new Map<string, string>();

/** Compute MD5 hash of content string via Rust backend. */
export async function computeHash(content: string): Promise<string> {
  return invoke<string>('compute_content_hash', { content });
}

/** Store the known hash for a file path. */
export function setFileHash(filePath: string, hash: string): void {
  hashStore.set(filePath, hash);
}

/** Get the stored hash for a file path (undefined if not tracked). */
export function getFileHash(filePath: string): string | undefined {
  return hashStore.get(filePath);
}

/** Remove tracking for a file path. */
export function removeFileHash(filePath: string): void {
  hashStore.delete(filePath);
}
