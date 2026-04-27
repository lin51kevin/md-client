import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '../../../plugins/plugin-sandbox';

const loadConfigMock = vi.fn();
const saveConfigMock = vi.fn();
const buildProviderConfigMock = vi.fn((providerId: string) => ({
  type: providerId === 'ollama' ? 'local' : 'cloud',
  provider: providerId,
  baseUrl: providerId === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1',
  apiKey: providerId === 'ollama' ? undefined : 'sk-test',
  model: 'test-model',
  priority: 1,
  enabled: true,
}));
const addProviderMock = vi.fn();
const chatMock = vi.fn(async () => 'assistant response');
const buildSystemPromptMock = vi.fn(() => 'system prompt');
const buildChatPromptMock = vi.fn(() => 'user prompt');
const ollamaHealthCheckMock = vi.fn(async () => true);
const openAIHealthCheckMock = vi.fn(async () => true);

vi.mock('../../../plugins/official/ai-copilot/src/config-store', () => ({
  loadConfig: loadConfigMock,
  saveConfig: saveConfigMock,
  buildProviderConfig: buildProviderConfigMock,
}));

vi.mock('../../../plugins/official/ai-copilot/src/providers/router', () => ({
  ProviderRouter: class {
    addProvider = addProviderMock;
    chat = chatMock;
    abort = vi.fn();
  },
}));

vi.mock('../../../plugins/official/ai-copilot/src/providers/ollama', () => ({
  OllamaProvider: class {
    configure = vi.fn();
    chat = vi.fn();
    healthCheck = ollamaHealthCheckMock;
    abort = vi.fn();
  },
}));

vi.mock('../../../plugins/official/ai-copilot/src/providers/openai-compatible', () => ({
  OpenAICompatibleProvider: class {
    configure = vi.fn();
    chat = vi.fn();
    healthCheck = openAIHealthCheckMock;
    abort = vi.fn();
    constructor(_name: string) {}
  },
}));

vi.mock('../../../plugins/official/ai-copilot/src/prompt-builder', () => ({
  buildSystemPrompt: buildSystemPromptMock,
  buildChatPrompt: buildChatPromptMock,
  extractModifiedText: vi.fn(() => null),
}));

vi.mock('../../../plugins/official/ai-copilot/src/ChatMessage', () => ({
  ChatMessageView: vi.fn(() => null),
}));

vi.mock('../../../plugins/official/ai-copilot/src/QuickCommands', () => ({
  SlashCommandPopup: vi.fn(() => null),
  getFilteredCommandCount: vi.fn(() => 0),
  getFilteredCommandAt: vi.fn(() => null),
}));

vi.mock('../../../plugins/official/ai-copilot/src/ModelSelector', () => ({
  ModelSelectorView: vi.fn(() => null),
}));

vi.mock('../../../plugins/official/ai-copilot/src/SettingsView', () => ({
  SettingsViewComponent: vi.fn(() => null),
}));

vi.mock('../../../i18n', () => ({
  getT: () => (key: string) => key,
  useI18n: () => ({ t: (key: string) => key }),
}));

const { AICopilotPanelContent } = await import('../../../plugins/official/ai-copilot/src/AICopilotPanel');

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createMockContext(): PluginContext {
  return {
    commands: { register: vi.fn() },
    sidebar: { registerPanel: vi.fn() },
    statusbar: { addItem: vi.fn() },
    editor: {
      getContent: vi.fn(() => '# Title\n\nBody'),
      getSelection: vi.fn(() => ({ from: 0, to: 5, text: 'Title' })),
      getCursorPosition: vi.fn(() => ({ line: 1, column: 1, offset: 0 })),
      insertText: vi.fn(),
      replaceRange: vi.fn(),
      getActiveFilePath: vi.fn(() => '/doc.md'),
    },
    workspace: {
      getActiveFile: vi.fn(() => ({ path: '/doc.md', name: 'doc.md' })),
      getAllFiles: vi.fn(() => []),
      openFile: vi.fn(),
      onFileChanged: vi.fn(),
      createNewDoc: vi.fn(),
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    ui: {
      showMessage: vi.fn(),
      showModal: vi.fn(),
    },
    files: {
      readFile: vi.fn(async () => null),
      watch: vi.fn(),
    },
    contextMenu: { addItem: vi.fn() },
    preview: { registerRenderer: vi.fn() },
    settings: { registerSection: vi.fn() },
    theme: { register: vi.fn() },
    export: { registerExporter: vi.fn() },
  } as unknown as PluginContext;
}

describe('AICopilotPanelContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadConfigMock.mockResolvedValue({
      activeProvider: 'ollama',
      providerConfigs: {},
      general: { maxHistoryLength: 50, applyMode: 'default' },
    });
  });

  it('registers the active provider during init even without a saved provider config', async () => {
    new AICopilotPanelContent(createMockContext());
    await Promise.resolve();
    await Promise.resolve();

    expect(buildProviderConfigMock).toHaveBeenCalledWith('ollama', undefined);
    expect(addProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'ollama' }),
      expect.anything(),
    );
  });

  it('waits for initialization before sending the first message', async () => {
    const deferred = createDeferred<{
      activeProvider: string;
      providerConfigs: Record<string, unknown>;
      general: { maxHistoryLength: number; applyMode: 'default' | 'bypass' };
    }>();
    loadConfigMock.mockReturnValueOnce(deferred.promise);
    const panel = new AICopilotPanelContent(createMockContext());

    const sendPromise = panel.sendMessage('/summarize');
    await Promise.resolve();

    expect(chatMock).not.toHaveBeenCalled();

    deferred.resolve({
      activeProvider: 'ollama',
      providerConfigs: {},
      general: { maxHistoryLength: 50, applyMode: 'default' },
    });
    await sendPromise;

    expect(chatMock).toHaveBeenCalled();
  });

  it('preserves parsed document scope for freeform summarize requests', async () => {
    const panel = new AICopilotPanelContent(createMockContext());
    await Promise.resolve();
    await Promise.resolve();

    await panel.sendMessage('总结一下这篇文档');

    expect(buildChatPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'summarize', target: 'document' }),
      expect.objectContaining({ scope: 'document' }),
    );
  });

  it('allows local provider connection tests without an api key', async () => {
    const panel = new AICopilotPanelContent(createMockContext());
    await Promise.resolve();
    await Promise.resolve();

    const result = await panel.testConnection({
      type: 'local',
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5',
      priority: 1,
      enabled: true,
    });

    expect(result).toEqual({ success: true });
    expect(ollamaHealthCheckMock).toHaveBeenCalled();
  });
});
