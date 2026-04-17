import { createElement, useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Settings, ArrowUp, X, Square } from 'lucide-react';
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
import { OllamaProvider } from './providers/ollama';
import { OpenAICompatibleProvider } from './providers/openai-compatible';
import { loadConfig, saveConfig, buildProviderConfig, type AIConfig } from './config-store';
import { parseIntent } from './intent-parser';
import type { ParsedIntent } from './intent-parser';
import { buildSystemPrompt, buildChatPrompt, extractModifiedText } from './prompt-builder';
import { buildStructuredSystemPrompt, buildStructuredChatPrompt } from './structured-prompt-builder';
import { getEffectiveScope, type ScopeResolution } from './edit-scope';
import { validateActionAgainstCurrentContent } from './stale-guard';
import { planEditActions, shouldBuildEditActions } from './edit-action-planner';
import { parseEditInstructions } from './instruction-parser';
import { executeInstructions } from './instruction-executor';
import { choosePromptMode } from './prompt-strategy';
import { ChatMessageView } from './ChatMessage';
import { SlashCommandPopup, getFilteredCommandCount, getFilteredCommandAt, getSlashCommandToken } from './QuickCommands';
import { ModelSelectorView } from './ModelSelector';
import { SettingsViewComponent } from './SettingsView';
import { getT, useI18n } from '../../../../i18n';

/**
 * Core panel content class following the backlinks pattern:
 * class with internal state + listeners + render() returning a React component.
 */
export class AICopilotPanelContent {
  private context: PluginContext;
  private router: ProviderRouter;
  private state: CopilotState;
  private config: AIConfig | null = null;
  private readonly ready: Promise<void>;
  private listeners: Set<() => void> = new Set();
  private idCounter = 0;
  /** Called when the user clicks the close button. Set by the host. */
  public onClose?: () => void;
  /** Called on mousedown to initiate drag. Set by the host (FloatingPanel). */
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
    this.setupProviders(config);
    this.setState({ selectedProvider: config.activeProvider });
  }

  private setupProviders(config: AIConfig) {
    const providerIds = new Set([config.activeProvider, ...Object.keys(config.providerConfigs)]);
    for (const id of providerIds) {
      const userConfig = config.providerConfigs[id];
      const pc = buildProviderConfig(id, userConfig);
      if (!pc) continue;
      if (id === 'ollama') {
        this.router.addProvider(pc, new OllamaProvider());
      } else {
        this.router.addProvider(pc, new OpenAICompatibleProvider(id));
      }
    }
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
        filePath: activeFilePath,
        content: activeContent,
        cursor,
        selection,
        scope,
        workspaceFiles: loaded.filter((f) => f.content.trim().length > 0),
      };
    }

    if (scope === 'tab' && targetFilePath) {
      const tabContent = await this.context.files.readFile(targetFilePath);
      if (tabContent !== null) {
        return {
          filePath: targetFilePath,
          content: tabContent,
          cursor: { line: 1, column: 1, offset: 0 },
          scope,
          targetFilePath,
        };
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
      this.context.ui.showMessage(
        t('aiCopilot.panel.scopeDowngraded', { fallback: effectiveScope }),
        'warning',
      );
    }

    const editorCtx = await this.captureContext(effectiveScope, intent.params.targetFilePath);
    const { assistantMsg } = this.appendMessagePair(text, intent.action, intent.confidence);

    // Delete with selection: no AI call needed — produce action directly
    if (intent.action === 'delete' && editorCtx.selection) {
      const actions = this.buildActions('', editorCtx, effectiveScope, intent.action);
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

  /** Create user + placeholder assistant messages and push them to state. */
  private appendMessagePair(text: string, intentAction?: string, intentConfidence?: number) {
    const userMsg: CopilotMessage = {
      id: this.nextId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    const assistantMsg: CopilotMessage = {
      id: this.nextId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      intentAction,
      intentConfidence,
    };
    const maxHistory = this.config?.general?.maxHistoryLength ?? 50;
    const trimmedHistory = this.state.messages.slice(-(maxHistory - 2));
    this.setState({
      messages: [...trimmedHistory, userMsg, assistantMsg],
      isLoading: true,
    });
    return { userMsg, assistantMsg };
  }

  /** Build prompts, send to AI, stream chunks into the assistant message. */
  private async streamAIResponse(
    intent: ParsedIntent,
    editorCtx: EditorContext,
    assistantId: string,
  ): Promise<string> {
    const promptMode = choosePromptMode(intent);
    const systemPrompt = promptMode === 'structured'
      ? buildStructuredSystemPrompt(editorCtx)
      : buildSystemPrompt(editorCtx);
    const userPrompt = promptMode === 'structured'
      ? buildStructuredChatPrompt(intent, editorCtx)
      : buildChatPrompt(intent, editorCtx);
    const chatMessages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Accumulate chunks and flush on the next animation frame to avoid
    // triggering a React re-render for every tiny streaming chunk.
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

    return this.router.chat(
      chatMessages,
      (chunk) => {
        pendingChunks += chunk;
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = 0;
            flushChunks();
          });
        }
      },
      this.state.selectedProvider || undefined,
    ).finally(() => {
      if (rafId) cancelAnimationFrame(rafId);
      flushChunks();
    });
  }

  /** Route completed AI response to the appropriate handler. */
  private handleAIResponse(
    fullResponse: string,
    intent: ReturnType<typeof parseIntent>,
    editorCtx: EditorContext,
    effectiveScope: EditScopeMode,
    assistantId: string,
    t: ReturnType<typeof getT>,
  ) {
    if (intent.action === 'create_document') {
      this.handleCreateDocument(fullResponse, assistantId, t);
      return;
    }

    const actions = shouldBuildEditActions(intent.action)
      ? this.buildActions(fullResponse, editorCtx, effectiveScope, intent.action)
      : [];

    const isBypass = (this.config?.general?.applyMode ?? 'default') === 'bypass';

    if (isBypass && actions.length > 0) {
      this.handleBypassApply(fullResponse, actions, assistantId, t);
    } else {
      this.finalizeAssistantMessage(fullResponse, assistantId, actions);
    }
  }

  /** Handle /new document creation. */
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
      const reason = toErrorMessage(err);
      this.context.ui.showMessage(t('aiCopilot.panel.newDocCreateFailed', { reason }), 'error');
    }
  }

  /** Bypass mode: auto-apply all actions immediately. */
  private handleBypassApply(
    fullResponse: string,
    actions: EditAction[],
    assistantId: string,
    t: ReturnType<typeof getT>,
  ) {
    this.finalizeAssistantMessage(fullResponse, assistantId);
    const { appliedCount, totalCount } = this.applyActionsBatch(actions);
    if (appliedCount === totalCount) {
      this.context.ui.showMessage(t('aiCopilot.panel.autoApplied'), 'info');
    } else if (appliedCount > 0) {
      this.context.ui.showMessage(
        t('aiCopilot.panel.autoAppliedPartial', { appliedCount, totalCount }),
        'warning',
      );
    } else {
      this.context.ui.showMessage(t('aiCopilot.panel.autoApplyFailed'), 'warning');
    }
  }

  /** Mark the assistant streaming message as done and optionally attach actions. */
  private finalizeAssistantMessage(fullResponse: string, assistantId: string, actions?: EditAction[]) {
    const finalMsgs = this.state.messages.map((m) =>
      m.id === assistantId
        ? { ...m, content: fullResponse, isStreaming: false, ...(actions ? { actions } : {}) }
        : m,
    );
    this.setState({ messages: finalMsgs, isLoading: false });
  }

  /** Handle errors from streaming, distinguishing user-initiated aborts. */
  private handleStreamError(error: unknown, assistantId: string) {
    const isAborted =
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted') || error.message.toLowerCase().includes('abort'));
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
    const finalMsgs = this.state.messages.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m,
    );
    this.setState({ messages: finalMsgs, isLoading: false });
  }

  private buildActions(response: string, editorCtx: EditorContext, scope: EditScopeMode, intentAction?: string): EditAction[] {
    // ── Try structured instruction path first ──
    const instructions = parseEditInstructions(response);
    if (instructions !== null) {
      const result = executeInstructions({
        docSnapshot: editorCtx.content,
        instructions,
        filePath: editorCtx.filePath,
        idFactory: () => this.nextId(),
      });
      if (result.allSuccess && result.actions.length > 0) {
        return result.actions;
      }
      // Partial or full failure — log and fall through to traditional path
      if (result.actions.length > 0) {
        console.warn(
          `[AI Copilot] Structured instructions partially failed (${result.results.filter(r => !r.success).length} failed), using ${result.actions.length} successful actions`,
        );
        return result.actions;
      }
      console.warn('[AI Copilot] All structured instructions failed, falling back to text replace');
    }

    // ── Traditional full-text replace path ──
    return planEditActions({
      response,
      editorCtx,
      scope,
      intentAction: intentAction as import('./intent-parser').ParsedIntent['action'] | undefined,
      idFactory: () => this.nextId(),
    });
  }

  applyAction(action: EditAction, successMessage?: string) {
    const t = getT();
    successMessage = successMessage ?? t('aiCopilot.panel.applied');
    if (!this.tryApplyAction(action)) return;
    this.context.ui.showMessage(successMessage, 'info');

    // Remove the action from messages
    const msgs = this.state.messages.map((m) => ({
      ...m,
      actions: m.actions?.filter((a) => a.id !== action.id),
    }));
    this.setState({ messages: msgs });
  }

  private tryApplyAction(action: EditAction): boolean {
    const t = getT();
    const currentPath = this.context.editor.getActiveFilePath();
    if (action.sourceFilePath && currentPath !== action.sourceFilePath) {
      this.context.workspace.openFile(action.sourceFilePath);
      this.context.ui.showMessage(t('aiCopilot.panel.fileSwitched'), 'warning');
      return false;
    }

    const validation = validateActionAgainstCurrentContent(action, this.context.editor.getContent());
    if (!validation.valid) {
      this.context.ui.showMessage(t('aiCopilot.panel.staleAction'), 'warning');
      return false;
    }

    switch (action.type) {
      case 'insert':
        this.context.editor.insertText(action.newText, action.from, action.to);
        return true;
      case 'delete':
        this.context.editor.replaceRange(action.from, action.to, '');
        return true;
      case 'replace':
      default:
        this.context.editor.replaceRange(action.from, action.to, action.newText);
        return true;
    }
  }

  /**
   * Validate all actions first, then apply in reverse offset order.
   * Stops before applying if any validation fails (prevents partial edits).
   */
  private applyActionsBatch(actions: EditAction[]): { appliedCount: number; totalCount: number } {
    const currentContent = this.context.editor.getContent();
    const ordered = [...actions].sort((a, b) => b.from - a.from || b.to - a.to);

    // Pre-validate all actions against current content
    for (const action of ordered) {
      const validation = validateActionAgainstCurrentContent(action, currentContent);
      if (!validation.valid) {
        return { appliedCount: 0, totalCount: actions.length };
      }
    }

    // All validated — apply in reverse order so offsets stay valid
    let appliedCount = 0;
    for (const action of ordered) {
      if (this.tryApplyAction(action)) {
        appliedCount += 1;
      }
    }
    return { appliedCount, totalCount: actions.length };
  }

  async toggleApplyMode() {
    if (!this.config) return;
    const current = this.config.general?.applyMode ?? 'default';
    const next = current === 'default' ? 'bypass' : 'default';
    this.config = {
      ...this.config,
      general: {
        ...this.config.general,
        maxHistoryLength: this.config.general?.maxHistoryLength ?? 50,
        applyMode: next,
      },
    };
    await saveConfig(this.context.storage, this.config);
    this.notify();
  }

  discardAction(actionId: string) {
    const msgs = this.state.messages.map((m) => ({
      ...m,
      actions: m.actions?.filter((a) => a.id !== actionId),
    }));
    this.setState({ messages: msgs });
  }

  discardMessage(messageId: string) {
    const msgs = this.state.messages.map((m) =>
      m.id === messageId ? { ...m, actions: [] } : m,
    );
    this.setState({ messages: msgs });
  }

  clearHistory() {
    this.setState({ messages: [] });
  }

  async updateConfig(newConfig: AIConfig) {
    this.config = newConfig;
    await saveConfig(this.context.storage, newConfig);

    // Rebuild providers
    this.router = new ProviderRouter();
    this.setupProviders(newConfig);
    this.setState({ selectedProvider: newConfig.activeProvider });
  }

  async testConnection(providerConfig: ProviderConfig): Promise<{ success: boolean; error?: string }> {

    
    // 验证配置
    if (providerConfig.type === 'cloud' && !providerConfig.apiKey) {
      return { 
        success: false, 
        error: 'API Key is required' 
      };
    }
    
    if (!providerConfig.baseUrl) {
      return { 
        success: false, 
        error: 'Base URL is required' 
      };
    }
    
    const provider = providerConfig.provider === 'ollama'
      ? new OllamaProvider()
      : new OpenAICompatibleProvider(providerConfig.provider);
    
    provider.configure(providerConfig);
    
    try {
      const result = await provider.healthCheck();

      
      if (result) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Health check returned false (provider may be down)' 
        };
      }
      
    } catch (err) {

      
      // 提供详细的错误信息
      let errorMessage = 'Unknown error';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout (5 seconds) - check network or service availability';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - unable to connect to API endpoint';
        } else {
          errorMessage = err.message;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  async setSelectedProvider(provider: string) {
    this.setState({ selectedProvider: provider });
    if (this.config) {
      const updated = { ...this.config, activeProvider: provider };
      this.config = updated;
      await saveConfig(this.context.storage, updated);
    }
  }

  /** Stable React component reference – created once, reused across render() calls. */
  private _Component: React.FunctionComponent | null = null;

  /** Returns a React function component for the sidebar renderer. */
  render() {
    if (this._Component) return this._Component;

    const self = this;

    function AICopilotPanel() {
      const { t } = useI18n();
      const [, forceUpdate] = useState(0);
      const [showSettings, setShowSettings] = useState(false);
      const [input, setInput] = useState('');
      const [showSlashPopup, setShowSlashPopup] = useState(false);
      const [slashFilter, setSlashFilter] = useState('');
      const [slashSelectedIndex, setSlashSelectedIndex] = useState(-1);
      const [isComposing, setIsComposing] = useState(false);
      const messagesEndRef = useRef<HTMLDivElement>(null);
      const inputRef = useRef<HTMLTextAreaElement>(null);

      // Subscribe to state changes
      useEffect(() => {
        const listener = () => forceUpdate((n) => n + 1);
        self.listeners.add(listener);
        return () => {
          self.listeners.delete(listener);
        };
      }, []);

      // Auto scroll
      useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });

      const handleSlashSelect = useCallback((command: string) => {
        setInput(command);
        setShowSlashPopup(false);
        inputRef.current?.focus();
      }, []);

      const resolveOpenSlashCommand = useCallback(() => {
        if (!showSlashPopup) return false;

        const count = getFilteredCommandCount(slashFilter, t);
        if (count === 0) return false;

        const idx = slashSelectedIndex >= 0 ? slashSelectedIndex : 0;
        const cmd = getFilteredCommandAt(slashFilter, idx, t);
        if (!cmd) return false;

        handleSlashSelect(cmd + ' ');
        return true;
      }, [handleSlashSelect, showSlashPopup, slashFilter, slashSelectedIndex, t]);

      const handleSend = useCallback(() => {
        if (isComposing) return;
        if (resolveOpenSlashCommand()) return;
        if (!input.trim()) return;
        const text = input;
        setInput('');
        setShowSlashPopup(false);
        self.sendMessage(text);
      }, [input, isComposing, resolveOpenSlashCommand]);

      const handleInputChange = useCallback((value: string) => {
        setInput(value);
        // Show slash popup when input starts with /
        const slashToken = getSlashCommandToken(value);
        if (slashToken !== null) {
          setShowSlashPopup(true);
          setSlashFilter(slashToken);
          setSlashSelectedIndex(0);
        } else {
          setShowSlashPopup(false);
          setSlashFilter('');
          setSlashSelectedIndex(-1);
        }
      }, []);

      const { messages, isLoading, selectedProvider } = self.state;

      // Icon button helper style
      const iconBtn: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-muted, #888)',
        cursor: 'pointer',
        borderRadius: '3px',
        padding: 0,
      };

      if (showSettings && self.config) {
        return createElement(SettingsViewComponent, {
          config: self.config,
          onSave: (cfg: AIConfig) => {
            self.updateConfig(cfg);
            setShowSettings(false);
          },
          onTestConnection: (pc: ProviderConfig) => self.testConnection(pc),
          onClose: () => setShowSettings(false),
        });
      }

      return createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-primary, #1e1e1e)',
            color: 'var(--text-primary, #e0e0e0)',
          },
        },

        // ── Header (doubles as drag handle for floating panel) ────
        createElement(
          'div',
          {
            onMouseDown: (e: React.MouseEvent) => self.onDragStart?.(e),
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderBottom: '1px solid var(--border-color, #2a2a2a)',
              flexShrink: 0,
              cursor: self.onDragStart ? 'move' : 'default',
              userSelect: 'none',
            },
          },
          createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary, #ccc)',
              },
            },
            t('aiCopilot.panel.chat'),
          ),
          createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
            // New chat
            createElement(
              'button',
              {
                onClick: () => self.clearHistory(),
                title: t('aiCopilot.panel.newChat'),
                style: iconBtn,
                onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
                onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.background = 'var(--hover-bg, rgba(255,255,255,0.06))';
                },
                onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.background = 'transparent';
                },
              },
              createElement(Plus, { size: 14 }),
            ),
            // Settings
            createElement(
              'button',
              {
                onClick: () => setShowSettings(true),
                title: t('aiCopilot.panel.settings'),
                style: iconBtn,
                onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
                onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.background = 'var(--hover-bg, rgba(255,255,255,0.06))';
                },
                onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.background = 'transparent';
                },
              },
              createElement(Settings, { size: 14 }),
            ),
            // Close panel
            self.onClose
              ? createElement(
                  'button',
                  {
                    onClick: () => self.onClose?.(),
                    title: t('aiCopilot.panel.close'),
                    style: iconBtn,
                    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
                    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.background = 'var(--hover-bg, rgba(255,255,255,0.06))';
                    },
                    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.background = 'transparent';
                    },
                  },
                  createElement(X, { size: 14 }),
                )
              : null,
          ),
        ),

        // ── Messages area ──────────────────────────────────────
        createElement(
          'div',
          {
            style: {
              flex: 1,
              overflow: 'auto',
              minHeight: 0,
              padding: '4px 0 8px',
            },
          },
          // Empty state
          messages.length === 0
            ? createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '20px',
                    color: 'var(--text-muted, #888)',
                  },
                },
                createElement(
                  'div',
                  { style: { fontSize: '13px', textAlign: 'center', lineHeight: '1.6' } },
                  t('aiCopilot.panel.emptyHint'),
                ),
              )
            : null,
          // Message list
          ...messages.map((msg) =>
            createElement(ChatMessageView, {
              key: msg.id,
              message: msg,
              onApply: (action: EditAction) => self.applyAction(action, t('aiCopilot.panel.applied')),
              onDiscard: (id: string) => self.discardAction(id),
              onDiscardAll: () => self.discardMessage(msg.id),
            }),
          ),
          createElement('div', { ref: messagesEndRef }),
        ),

        // ── Input area (bottom) ────────────────────────────────
        createElement(
          'div',
          {
            style: {
              flexShrink: 0,
              padding: '6px 10px 8px',
            },
          },
          // Outer bordered container — wraps tip, textarea, and model/send row
          createElement(
            'div',
            {
              style: {
                position: 'relative',
                border: '1px solid var(--border-color, #3c3c3c)',
                borderRadius: '6px',
                background: 'var(--bg-secondary, #252526)',
                display: 'flex',
                flexDirection: 'column' as const,
              },
            },
            // Tip line (only when empty)
            messages.length === 0
              ? createElement(
                  'div',
                  {
                    style: {
                      padding: '6px 10px 0',
                      fontSize: '11px',
                      color: 'var(--text-muted, #666)',
                    },
                  },
                  t('aiCopilot.panel.tipHint'),
                )
              : null,
            // Slash command popup
            showSlashPopup
              ? createElement(SlashCommandPopup, {
                  filter: slashFilter,
                  onSelect: handleSlashSelect,
                  selectedIndex: slashSelectedIndex,
                })
              : null,
            // Textarea (borderless)
            createElement('textarea', {
              ref: inputRef,
              value: input,
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange(e.target.value),
              onCompositionStart: () => setIsComposing(true),
              onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => {
                setIsComposing(false);
                handleInputChange(e.currentTarget.value);
              },
              onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                const nativeEvent = e.nativeEvent as KeyboardEvent;
                if (nativeEvent.isComposing || nativeEvent.keyCode === 229) {
                  return;
                }
                if (showSlashPopup) {
                  const count = getFilteredCommandCount(slashFilter, t);
                  if (e.key === 'ArrowDown') {
                    if (count === 0) return;
                    e.preventDefault();
                    setSlashSelectedIndex((prev) => (prev + 1) % count);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    if (count === 0) return;
                    e.preventDefault();
                    setSlashSelectedIndex((prev) => (prev <= 0 ? count - 1 : prev - 1));
                    return;
                  }
                  if ((e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) && count > 0) {
                    e.preventDefault();
                    resolveOpenSlashCommand();
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowSlashPopup(false);
                    setSlashSelectedIndex(-1);
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              },
              placeholder: t('aiCopilot.panel.placeholder'),
              rows: 2,
              disabled: isLoading,
              style: {
                width: '100%',
                padding: '8px 10px 4px',
                fontSize: '13px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary, #e0e0e0)',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box' as const,
              },
            }),
            // Bottom row: model selector (left) + send button (right)
            createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 6px 4px',
                },
              },
              // Model selector + apply mode toggle
              createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                self.config
                  ? createElement(ModelSelectorView, {
                      config: self.config,
                      activeProvider: selectedProvider,
                      onSelect: (p: string) => self.setSelectedProvider(p),
                    })
                  : null,
                // Apply mode toggle pill
                (() => {
                  const applyMode = self.config?.general?.applyMode ?? 'default';
                  const isBypass = applyMode === 'bypass';
                  return createElement(
                    'button',
                    {
                      onClick: () => self.toggleApplyMode(),
                      title: isBypass
                        ? t('aiCopilot.applyMode.autoTooltip')
                        : t('aiCopilot.applyMode.manualTooltip'),
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        height: '16px',
                        padding: '0 6px',
                        border: `1px solid ${isBypass ? 'var(--accent-color, #4a9eff)' : 'var(--border-color, #444)'}`,
                        borderRadius: '8px',
                        background: isBypass ? 'rgba(74,158,255,0.15)' : 'transparent',
                        color: isBypass ? 'var(--accent-color, #4a9eff)' : 'var(--text-muted, #666)',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.4px',
                        cursor: 'pointer',
                        userSelect: 'none' as const,
                        flexShrink: 0,
                      },
                    },
                    isBypass ? t('aiCopilot.applyMode.auto') : t('aiCopilot.applyMode.manual'),
                  );
                })(),
              ),
              // Send / Stop button
              isLoading
                ? createElement(
                    'button',
                    {
                      onClick: () => self.stopGeneration(),
                      title: t('aiCopilot.panel.stop'),
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        border: '1.5px solid var(--text-muted, #666)',
                        borderRadius: '50%',
                        background: 'var(--bg-secondary, #2d2d2d)',
                        color: 'var(--text-secondary, #ccc)',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                      },
                    },
                    createElement(Square, { size: 8, fill: 'currentColor' }),
                  )
                : createElement(
                    'button',
                    {
                      onClick: handleSend,
                      disabled: isComposing || !input.trim(),
                      title: t('aiCopilot.panel.send'),
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        border: 'none',
                        borderRadius: 0,
                        background: 'transparent',
                        color: 'var(--text-primary, #e0e0e0)',
                        cursor: !input.trim() ? 'default' : 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        opacity: !input.trim() ? 0.3 : 1,
                        transition: 'opacity 0.15s',
                      },
                    },
                    createElement(ArrowUp, { size: 16, strokeWidth: 2 }),
                  ),
            ),
          ),
        ),
      );
    }

    this._Component = AICopilotPanel;
    return AICopilotPanel;
  }
}
