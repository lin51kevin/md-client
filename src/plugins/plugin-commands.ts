import { registerCustomCommand, unregisterCustomCommand } from '../lib/editor';
import type { Command } from '../lib/editor';

/**
 * Create the commands API for plugin contexts.
 * Allows plugins to register custom commands that integrate with the editor's command palette.
 *
 * @returns Object with a `register` method.
 */
export function createCommandsAPI(): { register(id: string, handler: (...args: unknown[]) => void, options?: { label?: string; labelEn?: string; when?: () => boolean; category?: string }): { dispose(): void } } {
  return {
    register(id: string, handler: (...args: unknown[]) => void, options?: { label?: string; labelEn?: string; when?: () => boolean; category?: string }) {
      const cmd: Command = {
        id,
        label: options?.label ?? id,
        labelEn: options?.labelEn ?? id,
        shortcut: '',
        category: (options?.category as Command['category']) ?? 'custom',
        when: options?.when,
        action: handler as () => void,
      };
      registerCustomCommand(cmd);
      return { dispose: () => unregisterCustomCommand(id) };
    },
  };
}
