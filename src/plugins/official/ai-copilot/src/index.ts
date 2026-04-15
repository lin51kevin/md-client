import type { PluginContext } from '../../../plugin-sandbox';
import { AICopilotPanelContent } from './AICopilotPanel';

export function activate(context: PluginContext) {
  const panelContent = new AICopilotPanelContent(context);

  const panel = context.sidebar.registerPanel('ai-copilot-official', {
    title: 'AI Copilot',
    icon: 'sparkles',
    render: () => panelContent,
  });

  // Register commands
  const polishCmd = context.commands.register('ai.polish', () => {
    panelContent.sendMessage('/polish');
  });

  const explainCmd = context.commands.register('ai.explain', () => {
    panelContent.sendMessage('/explain');
  });

  const rewriteCmd = context.commands.register('ai.rewrite', () => {
    panelContent.sendMessage('/rewrite');
  });

  const summarizeCmd = context.commands.register('ai.summarize', () => {
    panelContent.sendMessage('/summarize');
  });

  const translateCmd = context.commands.register('ai.translate', () => {
    panelContent.sendMessage('/translate');
  });

  return {
    deactivate: () => {
      panel.dispose();
      polishCmd.dispose();
      explainCmd.dispose();
      rewriteCmd.dispose();
      summarizeCmd.dispose();
      translateCmd.dispose();
    },
  };
}
