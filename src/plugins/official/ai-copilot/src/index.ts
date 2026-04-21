import type { PluginContext } from '../../../plugin-sandbox';
import { AICopilotPanelContent } from './AICopilotPanel';

/** Event name dispatched by the Milkdown AI toolbar bridge. */
const AI_TOOLBAR_EVENT = 'ai-toolbar-action';
interface AIToolbarEventDetail { command: '/polish' | '/rewrite' | '/translate' | '/summarize'; }

/** AI context menu items — label uses emoji prefix for visual consistency. */
const AI_MENU_ITEMS = [
  { id: 'ai.polish',    label: '✨ AI 润色',  labelEn: '✨ AI Polish',    command: '/polish',    order: 0 },
  { id: 'ai.explain',   label: '📖 AI 解释',  labelEn: '📖 AI Explain',   command: '/explain',   order: 1 },
  { id: 'ai.translate', label: '🌐 AI 翻译',  labelEn: '🌐 AI Translate', command: '/translate', order: 2 },
  { id: 'ai.summarize', label: '📝 AI 总结',  labelEn: '📝 AI Summarize', command: '/summarize', order: 3 },
  { id: 'ai.rewrite',   label: '↔️ AI 改写',  labelEn: '↔️ AI Rewrite',   command: '/rewrite',   order: 4 },
] as const;

const PLUGIN_STORAGE_KEY = 'plugin.ai-copilot-official.ai-config';

/**
 * Sync check: returns true when AI is usable.
 * Local providers (e.g. Ollama) are always considered enabled.
 * Cloud providers require an API key.
 */
function isAIEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PLUGIN_STORAGE_KEY);
    if (!raw) return false;
    const cfg = JSON.parse(raw) as {
      activeProvider?: string;
      providerConfigs?: Record<string, { apiKey?: string }>;
    };
    const provider = cfg.activeProvider ?? '';
    // Local providers don't need an API key
    if (provider === 'ollama' || provider === 'lmstudio') return true;
    // Cloud providers need a key
    const key = cfg.providerConfigs?.[provider]?.apiKey;
    return typeof key === 'string' && key.trim().length > 0;
  } catch {
    return false;
  }
}

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
  // - label/labelEn: i18n display names shown in the palette
  // - category: 'ai' so they group under the AI Assistant section
  // - when: only shown when AI is enabled (provider configured)
  const commandDisposables = AI_MENU_ITEMS.map((item) =>
    context.commands.register(
      item.id,
      () => { panelContent.sendMessage(item.command); },
      { label: item.label, labelEn: item.labelEn, category: 'ai', when: isAIEnabled },
    ),
  );

  // Bridge: listen for AI toolbar button clicks from Milkdown's floating toolbar
  const toolbarHandler = (e: Event) => {
    const { command } = (e as CustomEvent<AIToolbarEventDetail>).detail;
    panelContent.sendMessage(command);
  };
  document.addEventListener(AI_TOOLBAR_EVENT, toolbarHandler);

  return {
    deactivate: () => {
      panel.dispose();
      menuDisposables.forEach((d) => d.dispose());
      commandDisposables.forEach((d) => d.dispose());
      document.removeEventListener(AI_TOOLBAR_EVENT, toolbarHandler);
    },
  };
}
