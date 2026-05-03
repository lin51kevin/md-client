/**
 * minimap-bridge — Singleton registry for the minimap CodeMirror extension.
 *
 * Official plugins call registerMinimap() during activation;
 * the core editor calls getMinimapExtension() to conditionally
 * include it in the extension list.
 */
import type { Extension } from '@codemirror/state';
import { notifyBridgeChange } from './bridge-signal';

let _minimapExtension: Extension | null = null;

export function registerMinimap(ext: Extension): void {
  _minimapExtension = ext;
  notifyBridgeChange();
}

export function unregisterMinimap(): void {
  _minimapExtension = null;
  notifyBridgeChange();
}

export function getMinimapExtension(): Extension | null {
  return _minimapExtension;
}
