import type { PluginContext } from '../../../plugin-sandbox';
import { SnippetPluginPanel } from './SnippetPluginPanel';

export function activate(context: PluginContext) {
  const cmdDisposable = context.commands.register('snippet-manager.open', () => {
    context.ui.showMessage('Snippet Manager 插件：可管理分类片段');
  });

  const panelDisposable = context.sidebar.registerPanel('snippet-manager-official', {
    title: 'Snippets',
    icon: 'braces',
    render: () => new SnippetPluginPanel(context),
  });

  return {
    deactivate() {
      cmdDisposable.dispose();
      panelDisposable.dispose();
    },
  };
}
