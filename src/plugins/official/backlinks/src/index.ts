import type { PluginContext } from '../../../plugin-sandbox';
import { BacklinksPanelContent } from './BacklinksPanel';

export function activate(context: PluginContext) {
  const panelContent = new BacklinksPanelContent(context);

  const panel = context.sidebar.registerPanel('backlinks-official', {
    title: 'Backlinks',
    icon: '🔗',
    render: () => panelContent,
  });

  context.workspace.onFileChanged(() => panelContent.refresh());

  return {
    deactivate: () => panel.dispose(),
  };
}
