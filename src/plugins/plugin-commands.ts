import { registerCustomCommand, unregisterCustomCommand } from '../lib/command-registry';
import type { Command } from '../lib/commands';

export function createCommandsAPI(): { register(id: string, handler: (...args: unknown[]) => void): { dispose(): void } } {
  return {
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
