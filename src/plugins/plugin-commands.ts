import { registerCustomCommand, unregisterCustomCommand } from '../lib/editor';
import type { Command } from '../lib/editor';

/**
 * Create the commands API for plugin contexts.
 * Allows plugins to register custom commands that integrate with the editor's command palette.
 *
 * @returns Object with a `register` method.
 */
export function createCommandsAPI(): { register(id: string, handler: (...args: unknown[]) => void): { dispose(): void } } {
  return {
    /**
     * Register a custom command.
     * @param id - Unique command identifier (e.g. 'myPlugin.doSomething').
     * @param handler - Function to execute when the command is invoked.
     * @returns A disposable that unregisters the command on dispose.
     */
    register(id: string, handler: (...args: unknown[]) => void) {
      const cmd: Command = {
        id,
        label: id,
        labelEn: id,
        shortcut: '',
        category: 'custom',
        action: handler as () => void,
      };
      registerCustomCommand(cmd);
      return { dispose: () => unregisterCustomCommand(id) };
    },
  };
}
