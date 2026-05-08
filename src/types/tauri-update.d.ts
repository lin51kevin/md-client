/**
 * Type declarations for Tauri auto-updater events.
 *
 * The @tauri-apps/plugin-updater package doesn't export a DownloadEvent
 * type at the time of writing, so we declare it here to avoid `any`.
 */

/** Progress event emitted during a Tauri update download. */
export interface TauriDownloadEvent {
  /** Bytes downloaded in this chunk. */
  chunkLength: number;
  /** Total bytes downloaded so far. */
  downloaded: number;
  /** Total content length (may be undefined when the server doesn't provide it). */
  contentLength?: number;
}
