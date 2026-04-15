import { invoke } from '@tauri-apps/api/core';

/**
 * Reveal the given file in the system's file explorer.
 * Windows: explorer /select,<path>
 * macOS: open -R <path>
 * Linux: xdg-open <dirname>
 */
export async function revealInExplorer(filePath: string): Promise<void> {
  await invoke('reveal_in_explorer', { path: filePath });
}
