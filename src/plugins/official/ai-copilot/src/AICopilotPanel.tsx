import { createElement, useState, useEffect } from 'react';
import { Plus, Settings, X } from 'lucide-react';
import { toErrorMessage } from '../../../../lib/utils/errors';
import type { PluginContext } from '../../../plugin-sandbox';
import type {
  CopilotMessage,
  CopilotState,
  EditAction,
  EditScopeMode,
  EditorContext,
  ChatMessage as AIChatMessage,
  ProviderConfig,
} from './providers/types';
import { ProviderRouter } from './providers/router';
import { loadConfig, saveConfig, type AIConfig } from './config-store';
import { parseIntent } from './intent-parser';
import type { ParsedIntent } from './intent-parser';
import { buildSystemPrompt, buildChatPrompt, extractModifiedText } from './prompt-builder';
import { buildStructuredSystemPrompt, buildStructuredChatPrompt } from './structured-prompt-builder';
import { getEffectiveScope, type ScopeResolution } from './edit-scope';
import { choosePromptMode } from './prompt-strategy';
import { shouldBuildEditActions } from './edit-action-planner';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { SettingsViewComponent } from './SettingsView';
import { getT, useI18n } from '../../../../i18n';
import { buildActions, tryApplyAction, applyActionsBatch } from './edit-actions';
import { setupProviders, testConnection } from './provider-utils';

export class AICopilotPanelContent {
  private context: PluginContext;
  private router: ProviderRouter;
  private state: CopilotState;
  private config: AIConfig | null = null;
  private readonly ready: Promise<void>;
  private listeners: Set<() => void> = new Set();
  private idCounter = 0;

  public onClose?: () => void;
  public onDragStart?: (e: React.MouseEvent) => void;

  constructor(context: PluginContext) {
    this.context = context;
    this.router = new ProviderRouter();
    this.state = { messages: [], isLoading: false, selectedProvider: '' };
    this.ready = this.init();
    this.ready.catch((err) => console.error('[AI Copilot] Initialization failed:', err));
  }

  private nextId(): string {
    return `msg-${Date.now()}-${++this.idCounter}`;
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private setState(partial: Partial<CopilotState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private async init() {
    const config = await loadConfig(this.context.storage);
    this.config = config;
    setupProviders(this.router, config);
    this.setState({ selectedProvider: config.activeProvider });
  }

  private async captureContext(scope: EditScopeMode, targetFilePath?: string): Promise<EditorContext> {
    const t = getT();
    const activeContent = this.context.editor.getContent();
    const cursor = this.context.editor.getCursorPosition();
    const selection = this.context.editor.getSelection() ?? undefined;
    const activeFilePath = this.context.editor.getActiveFilePath();

    if (scope === 'workspace') {
      const workspaceFiles = this.context.workspace
        .getAllFiles()
        .filter((p) => /\.(md|markdown)$/i.test(p))
        .slice(0, 8);
      const loaded = await Promise.all(
        workspaceFiles.map(async (path) => ({ path, content: (await this.context.files.readFile(path)) ?? '' })),
      );
      return {
        filePath: activeFilePath, content: activeContent, cursor, selection, scope,
        workspaceFiles: loaded.filter((f) => f.content.trim().length > 0),
      };
    }

    if (scope === 'tab' && targetFilePath) {
      const tabContent = await this.context.files.readFile(targetFilePath);
      if (tabContent !== null) {
        return { filePath: targetFilePath, content: tabContent, cursor: { line: 1, column: 1, offset: 0 }, scope, targetFilePath };
      }
      this.context.ui.showMessage(t('aiCopilot.panel.targetNotFound', { path: targetFilePath }), 'warning');
    }

    return { filePath: activeFilePath, content: activeContent, cursor, selection, scope, targetFilePath };
  }

  async sendMessage(text: string) {
    await this.ready;
    if (!text.trim() || this.state.isLoading) return;

    const t = getT();
    const intent = parseIntent(text);
    const hasSelection = Boolean(this.context.editor.getSelection());
    const scopeResolution: ScopeResolution = text.trim().startsWith('/scope ')
      ? { scope: intent.target, downgraded: false }
      : getEffectiveScope(intent.target, hasSelection, intent.action);
    const effectiveScope = scopeResolution.scope;

    if (scopeResolution.downgraded) {
      this.context.ui.showMessage(t('aiCopilot.panel.scopeDowngraded', { fallback: effectiveScope }), 'warning');
    }

    const editorCtx = await this.captureContext(effectiveScope, intent.params.targetFilePath);
    const { assistantMsg } = this.appendMessagePair(text, intent.action, intent.confidence);

    if (intent.action === 'delete' && editorCtx.selection) {
      const actions = buildActions('', editorCtx, effectiveScope, intent.action, () => this.nextId());
      this.finalizeAssistantMessage('', assistantMsg.id, actions.length > 0 ? actions : undefined);
      if (actions.length > 0 && (this.config?.general?.applyMode ?? 'default') === 'bypass') {
        this.handleBypassApply('', actions, assistantMsg.id, t);
      }
      return;
    }

    try {
      const fullResponse = await this.streamAIResponse(intent, editorCtx, assistantMsg.id);
      this.handleAIResponse(fullResponse, intent, editorCtx, effectiveScope, assistantMsg.id, t);
    } catch (error) {
      this.handleStreamError(error, assistantMsg.id);
    }
  }

  private appendMessagePair(text: string, intentAction?: string, intentConfidence?: number) {
    const userMsg: CopilotMessage = { id: this.nextId(), role: 'user', content: text, timestamp: Date.now() };
    const assistantMsg: CopilotMessage = {
      id: this.nextId(), role: 'assistant', content: '', timestamp: Date.now(),
      isStreaming: true, intentAction, intentConfidence,
    };
    const maxHistory = this.config?.general?.maxHistoryLength ?? 50;
    const trimmedHistory = this.state.messages.slice(-(maxHistory - 2));
    this.setState({ messages: [...trimmedHistory, userMsg, assistantMsg], isLoading: true });
    return { userMsg, assistantMsg };
  }

  private async streamAIResponse(intent: ParsedIntent, editorCtx: EditorContext, assistantId: string): Promise<string> {
    const promptMode = choosePromptMode(intent);
    const systemPrompt = promptMode === 'structured' ? buildStructuredSystemPrompt(editorCtx) : buildSystemPrompt(editorCtx);
    const userPrompt = promptMode === 'structured' ? buildStructuredChatPrompt(intent, editorCtx) : buildChatPrompt(intent, editorCtx);
    const chatMessages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let pendingChunks = '';
    let rafId = 0;
    const flushChunks = () => {
      if (!pendingChunks) return;
      const batch = pendingChunks;
      pendingChunks = '';
      const msgs = this.state.messages.map((m) =>
        m.id === assistantId ? { ...m, content: m.content + batch } : m,
      );
      this.setState({ messages: msgs });
    };

    return this.router.chat(chatMessages, (chunk) => {
      pendingChunks += chunk;
      if (!rafId) {
        rafId = requestAnimationFrame(() => { rafId = 0; flushChunks(); });
      }
    }, this.state.selectedProvider || undefined).finally(() => {
      if (rafId) cancelAnimationFrame(rafId);
      flushChunks();
    });
  }

  private handleAIResponse(fullResponse: string, intent: ReturnType<typeof parseIntent>, editorCtx: EditorContext, effectiveScope: EditScopeMode, assistantId: string, t: ReturnType<typeof getT>) {
    if (intent.action === 'create_document') {
      this.handleCreateDocument(fullResponse, assistantId, t);
      return;
    }
    const actions = shouldBuildEditActions(intent.action)
      ? buildActions(fullResponse, editorCtx, effectiveScope, intent.action, () => this.nextId())
      : [];
    const isBypass = (this.config?.general?.applyMode ?? 'default') === 'bypass';
    if (isBypass && actions.length > 0) {
      this.handleBypassApply(fullResponse, actions, assistantId, t);
    } else {
      this.finalizeAssistantMessage(fullResponse, assistantId, actions);
    }
  }

  private handleCreateDocument(fullResponse: string, assistantId: string, t: ReturnType<typeof getT>) {
    const newDocContent = extractModifiedText(fullResponse) ?? fullResponse;
    this.finalizeAssistantMessage(fullResponse, assistantId);
    if (!newDocContent.trim()) {
      this.context.ui.showMessage(t('aiCopilot.panel.newDocEmpty'), 'warning');
      return;
    }
    try {
      this.context.workspace.createNewDoc(newDocContent);
      this.context.ui.showMessage(t('aiCopilot.panel.newDocCreated'), 'info');
    } catch (err) {
      this.context.ui.showMessage(t('aiCopilot.panel.newDocCreateFailed', { reason: toErrorMessage(err) }), 'error');
    }
  }

  private handleBypassApply(fullResponse: string, actions: EditAction[], assistantId: string, t: ReturnType<typeof getT>) {
    this.finalizeAssistantMessage(fullResponse, assistantId);
    const ed = this.context.editor;
    const { appliedCount, totalCount } = applyActionsBatch(actions, {
      getContent: () => ed.getContent(),
      insertText: (text, from, to) => ed.insertText(text, from, to),
      replaceRange: (from, to, text) => ed.replaceRange(from, to, text),
    });
    if (appliedCount === totalCount) {
      this.context.ui.showMessage(t('aiCopilot.panel.autoApplied'), 'info');
    } else if (appliedCount > 0) {
      this.context.ui.showMessage(t('aiCopilot.panel.autoAppliedPartial', { appliedCount, totalCount }), 'warning');
    } else {
      this.context.ui.showMessage(t('aiCopilot.panel.autoApplyFailed'), 'warning');
    }
  }

  private finalizeAssistantMessage(fullResponse: string, assistantId: string, actions?: EditAction[]) {
    const finalMsgs = this.state.messages.map((m) =>
      m.id === assistantId ? { ...m, content: fullResponse, isStreaming: false, ...(actions ? { actions } : {}) } : m,
    );
    this.setState({ messages: finalMsgs, isLoading: false });
  }

  private handleStreamError(error: unknown, assistantId: string) {
    const isAborted = error instanceof Error &&
      (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted'));
    const finalMsgs = this.state.messages.map((m) =>
      m.id === assistantId
        ? isAborted
          ? { ...m, isStreaming: false, stopped: true }
          : { ...m, content: '', isStreaming: false, error: error instanceof Error ? error.message : String(error) }
        : m,
    );
    this.setState({ messages: finalMsgs, isLoading: false });
  }

  stopGeneration() {
    this.router.abort();
    this.setState({
      messages: this.state.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
      isLoading: false,
    });
  }

  /** Test a provider connection (delegates to provider-utils). */
  testConnection(config: ProviderConfig) {
    return testConnection(config);
  }

  applyAction(action: EditAction, successMessage?: string) {
    const t = getT();
    successMessage = successMessage ?? t('aiCopilot.panel.applied');
    const ed = this.context.editor;
    const result = tryApplyAction(action, {
      getActiveFilePath: () => ed.getActiveFilePath() ?? undefined,
      getContent: () => ed.getContent(),
      insertText: (text, from, to) => ed.insertText(text, from, to),
      replaceRange: (from, to, text) => ed.replaceRange(from, to, text),
    }, this.context.workspace);
    if (result.switchedFile) {
      this.context.ui.showMessage(t('aiCopilot.panel.fileSwitched'), 'warning');
      return;
    }
    if (!result.applied) {
      if (result.stale) this.context.ui.showMessage(t('aiCopilot.panel.staleAction'), 'warning');
      return;
    }
    this.context.ui.showMessage(successMessage, 'info');
    this.setState({
      messages: this.state.messages.map((m) => ({
        ...m, actions: m.actions?.filter((a) => a.id !== action.id),
      })),
    });
  }

  async toggleApplyMode() {
    if (!this.config) return;
    const next = (this.config.general?.applyMode ?? 'default') === 'default' ? 'bypass' : 'default';
    this.config = { ...this.config, general: { ...this.config.general, maxHistoryLength: this.config.general?.maxHistoryLength ?? 50, applyMode: next } };
    await saveConfig(this.context.storage, this.config);
    this.notify();
  }

  discardAction(actionId: string) {
    this.setState({ messages: this.state.messages.map((m) => ({ ...m, actions: m.actions?.filter((a) => a.id !== actionId) })) });
  }

  discardMessage(messageId: string) {
    this.setState({ messages: this.state.messages.map((m) => (m.id === messageId ? { ...m, actions: [] } : m)) });
  }

  clearHistory() { this.setState({ messages: [] }); }

  async updateConfig(newConfig: AIConfig) {
    this.config = newConfig;
    await saveConfig(this.context.storage, newConfig);
    this.router = new ProviderRouter();
    setupProviders(this.router, newConfig);
    this.setState({ selectedProvider: newConfig.activeProvider });
  }

  async setSelectedProvider(provider: string) {
    this.setState({ selectedProvider: provider });
    if (this.config) {
      this.config = { ...this.config, activeProvider: provider };
      await saveConfig(this.context.storage, this.config);
    }
  }

  private _Component: React.FunctionComponent | null = null;

  render() {
    if (this._Component) return this._Component;
    const self = this;

    function AICopilotPanel() {
      const { t } = useI18n();
      const [, forceUpdate] = useState(0);
      const [showSettings, setShowSettings] = useState(false);

      useEffect(() => {
        const listener = () => forceUpdate((n) => n + 1);
        self.listeners.add(listener);
        return () => { self.listeners.delete(listener); };
      }, []);

      const { messages, isLoading, selectedProvider } = self.state;

      const iconBtn: React.CSSProperties = {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '22px', height: '22px', border: 'none', background: 'transparent',
        color: 'var(--text-muted, #888)', cursor: 'pointer', borderRadius: '3px', padding: 0,
      };

      const hoverBtnEvents = {
        onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'var(--hover-bg, rgba(255,255,255,0.06))'; },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'transparent'; },
      };

      if (showSettings && self.config) {
        return createElement(SettingsViewComponent, {
          config: self.config,
          onSave: (cfg: AIConfig) => { self.updateConfig(cfg); setShowSettings(false); },
          onTestConnection: (pc: ProviderConfig) => testConnection(pc),
          onClose: () => setShowSettings(false),
        });
      }

      return createElement('div', {
        style: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary, #1e1e1e)', color: 'var(--text-primary, #e0e0e0)' },
      },
        // Header
        createElement('div', {
          onMouseDown: (e: React.MouseEvent) => self.onDragStart?.(e),
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-color, #2a2a2a)', flexShrink: 0, cursor: self.onDragStart ? 'move' : 'default', userSelect: 'none' },
        },
          createElement('span', { style: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary, #ccc)' } }, t('aiCopilot.panel.chat')),
          createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
            createElement('button', { onClick: () => self.clearHistory(), title: t('aiCopilot.panel.newChat'), style: iconBtn, ...hoverBtnEvents }, createElement(Plus, { size: 14 })),
            createElement('button', { onClick: () => setShowSettings(true), title: t('aiCopilot.panel.settings'), style: iconBtn, ...hoverBtnEvents }, createElement(Settings, { size: 14 })),
            self.onClose ? createElement('button', { onClick: () => self.onClose?.(), title: t('aiCopilot.panel.close'), style: iconBtn, ...hoverBtnEvents }, createElement(X, { size: 14 })) : null,
          ),
        ),
        // Messages
        createElement(ChatArea, {
          messages,
          emptyHint: t('aiCopilot.panel.emptyHint'),
          onApply: (action: EditAction) => self.applyAction(action, t('aiCopilot.panel.applied')),
          onDiscard: (id: string) => self.discardAction(id),
          onDiscardAll: (messageId: string) => self.discardMessage(messageId),
        }),
        // Input
        createElement(ChatInput, {
          isLoading, config: self.config, selectedProvider,
          messagesEmpty: messages.length === 0,
          placeholder: t('aiCopilot.panel.placeholder'),
          tipHint: t('aiCopilot.panel.tipHint'),
          labels: {
            stop: t('aiCopilot.panel.stop'), send: t('aiCopilot.panel.send'),
            autoLabel: t('aiCopilot.applyMode.auto'), manualLabel: t('aiCopilot.applyMode.manual'),
            autoTooltip: t('aiCopilot.applyMode.autoTooltip'), manualTooltip: t('aiCopilot.applyMode.manualTooltip'),
          },
          t: t as unknown as (key: string, params?: Record<string, string | number>) => string,
          callbacks: {
            onSend: (text: string) => self.sendMessage(text),
            onStop: () => self.stopGeneration(),
            onSelectProvider: (p: string) => self.setSelectedProvider(p),
            onToggleApplyMode: () => self.toggleApplyMode(),
          },
        }),
      );
    }

    this._Component = AICopilotPanel;
    return AICopilotPanel;
  }
}
