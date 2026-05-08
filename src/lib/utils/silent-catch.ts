/**
 * silentCatch — Dev-friendly error silencer.
 *
 * For non-critical UI helper operations (clipboard, reveal-in-explorer,
 * fullscreen toggle, etc.) that intentionally swallow errors so they
 * don't crash the app or spam the console.
 *
 * In development mode a `console.warn` is emitted (with optional
 * context label) so bugs are still visible during debugging.
 * In production the error is silently discarded.
 */
export function silentCatch(error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    const prefix = context ? `[SilentCatch] ${context}: ` : '[SilentCatch] ';
    if (error instanceof Error) {
      console.warn(prefix + error.message);
    } else {
      console.warn(prefix + String(error));
    }
  }
}
