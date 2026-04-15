import type { PluginContext } from '../../../plugin-sandbox';
import { AICopilotPanelContent } from './AICopilotPanel';

/** AI context menu items — label uses emoji prefix for visual consistency. */
const AI_MENU_ITEMS = [
  { id: 'ai.polish',    label: '✨ AI 润色',  labelEn: '✨ AI Polish',    command: '/polish',    order: 0 },
  { id: 'ai.explain',   label: '📖 AI 解释',  labelEn: '📖 AI Explain',   command: '/explain',   order: 1 },
  { id: 'ai.translate', label: '🌐 AI 翻译',  labelEn: '🌐 AI Translate', command: '/translate', order: 2 },
  { id: 'ai.summarize', label: '📝 AI 总结',  labelEn: '📝 AI Summarize', command: '/summarize', order: 3 },
  { id: 'ai.rewrite',   label: '↔️ AI 改写',  labelEn: '↔️ AI Rewrite',   command: '/rewrite',   order: 4 },
] as const;

export function activate(context: PluginContext) {
  const panelContent = new AICopilotPanelContent(context);

  const panel = context.sidebar.registerPanel('ai-copilot-official', {
    title: 'AI Copilot',
    icon: 'sparkles',
    render: () => panelContent,
  });

  // Detect locale from document/localStorage
  const isZh = typeof document !== 'undefined' &&
    (document.documentElement.lang === 'zh-CN' ||
     localStorage.getItem('marklite-locale') === 'zh-CN');

  // Register context menu items — visible only when text is selected
  const menuDisposables = AI_MENU_ITEMS.map((item) =>
    context.contextMenu.addItem({
      id: item.id,
      label: isZh ? item.label : item.labelEn,
      group: 'ai',
      order: item.order,
      when: { hasSelection: true },
      action: () => panelContent.sendMessage(item.command),
    }),
  );

  // Register commands (for keyboard shortcuts / command palette)
  const commandDisposables = AI_MENU_ITEMS.map((item) =>
    context.commands.register(item.id, () => {
      panelContent.sendMessage(item.command);
    }),
  );

  return {
    deactivate: () => {
      panel.dispose();
      menuDisposables.forEach((d) => d.dispose());
      commandDisposables.forEach((d) => d.dispose());
    },
  };
}
