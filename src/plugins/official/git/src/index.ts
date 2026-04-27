import type { PluginContext } from '../../../plugin-sandbox';
import { GitPanelContent } from './GitPanelContent';

interface PluginResult {
  deactivate: () => void;
}

export function activate(context: PluginContext): PluginResult {
  const panelContent = new GitPanelContent(context);

  const panel = context.sidebar.registerPanel('git-official', {
    title: 'Source Control',
    icon: 'git-branch',
    render: () => panelContent,
  });

  return {
    deactivate: () => {
      panel.dispose();
    },
  };
}

export function deactivate(): void {
  // no-op — cleanup is done via the return value of activate
}
