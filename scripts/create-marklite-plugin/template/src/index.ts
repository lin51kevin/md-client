import type { PluginContext } from '@marklite/plugin-api';

export function activate(context: PluginContext) {
  console.log('[{{pluginId}}] Plugin activated');

  // TODO: 注册你的功能
  // context.commands.register('myplugin.hello', () => { ... });
  // context.sidebar.registerPanel('myplugin-panel', { title: '{{pluginName}}', render: () => ... });

  return {
    deactivate() {
      console.log('[{{pluginId}}] Plugin deactivated');
    },
  };
}
