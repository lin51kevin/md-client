import type { PluginContext } from '../../../plugin-sandbox';
import { TagPanelContent } from './TagPanel';

export function activate(context: PluginContext) {
  const panelContent = new TagPanelContent(context);

  const panel = context.sidebar.registerPanel('tag-system-official', {
    title: 'Tags',
    icon: 'hash',
    render: () => panelContent,
  });

  context.workspace.onFileChanged(() => panelContent.refresh());

  return {
    deactivate: () => {
      panel.dispose();
      panelContent.dispose();
    },
  };
}
