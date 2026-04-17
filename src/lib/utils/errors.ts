/**
 * Error extraction utilities.
 *
 * Centralizes the common pattern:
 *   `err instanceof Error ? err.message : String(err)`
 *
 * Used across 20+ call sites in hooks and components.
 */

/**
 * Extract a human-readable message from an unknown thrown value.
 * Works for Error instances, strings, and any other thrown type.
 */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
