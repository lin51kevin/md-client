import type { PluginContext } from '../../../plugin-sandbox';
import { TerminalPanel } from './TerminalPanel';

interface PluginResult {
  deactivate: () => void;
}

/**
 * Activate the Terminal plugin.
 * Registers a sidebar panel with an embedded xterm.js terminal.
 */
export function activate(context: PluginContext): PluginResult {
  const panel = context.sidebar.registerPanel('terminal', {
    title: 'Terminal',
    icon: 'terminal',
    render: () => <TerminalPanel context={context} />,
  });

  // Register a command to toggle the terminal panel
  const cmd = context.commands.register('terminal.toggle', () => {
    // The sidebar panel will be toggled by the sidebar infrastructure
    // This command exists as an entry point for keyboard shortcuts
  }, {
    label: '切换终端',
    labelEn: 'Toggle Terminal',
    category: 'Terminal',
  });

  return {
    deactivate: () => {
      panel.dispose();
      cmd.dispose();
    },
  };
}

export function deactivate(): void {
  // Cleanup is done via the return value of activate
}
