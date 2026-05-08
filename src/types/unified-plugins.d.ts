/**
 * unified plugin type augmentation for rehype/remark plugins.
 *
 * Many remark/rehype plugins export a function that doesn't perfectly
 * match the strict Plugin type from `unified`.  This module provides
 * a convenience type so callers can avoid `as any` casts.
 */

import type { Plugin } from 'unified';

/**
 * Relaxed unified plugin type – accepts any plugin that follows the
 * `(this: Processor, ...options) => void` signature, regardless of
 * whether its generic parameters perfectly match.
 */
export type UnifiedPlugin<Input = unknown, Options = unknown> = Plugin<Input, Options>;
