/**
 * vim-bridge.ts — Vim extension registration bridge.
 *
 * The core editor no longer imports @replit/codemirror-vim directly.
 * Instead, the marklite-vim plugin registers its CodeMirror extension here,
 * and the core editor reads it via getVimExtension().
 */
import type { Extension } from '@codemirror/state';

let vimExtension: Extension | null = null;

export function registerVimExtension(ext: Extension): void {
  vimExtension = ext;
}

export function unregisterVimExtension(): void {
  vimExtension = null;
}

export function getVimExtension(): Extension | null {
  return vimExtension;
}

export function isVimAvailable(): boolean {
  return vimExtension !== null;
}
