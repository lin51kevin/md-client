import { createElement, useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Settings, ArrowUp, X, Square } from 'lucide-react';
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
import { buildSystemPrompt, buildChatPrompt, extractModifiedText } from './prompt-builder';
import { getEffectiveScope } from './edit-scope';
import { validateActionAgainstCurrentContent } from './stale-guard';
import { createMarkdownSectionActions } from './markdown-actions';
import { ChatMessageView } from './ChatMessage';
import { SlashCommandPopup, getFilteredCommandCount, getFilteredCommandAt } from './QuickCommands';
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
  private listeners: Set<() => void> = new Set();
  private idCounter = 0;
  /** Called when the user clicks the close button. Set by the host. */
  public onClose?: () => void;
  /** Called on mousedown to initiate drag. Set by the host (FloatingPanel). */
  public onDragStart?: (e: React.MouseEvent) => void;

  constructor(context: PluginContext) {
    this.context = context;
    this.router = new ProviderRouter();
    this.state = { messages: [], isLoading: false, selectedProvider: '', editScope: 'selection' };
    this.init().catch((err) => console.error('[AI Copilot] Initialization failed:', err));
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
    for (const [id, userConfig] of Object.entries(config.providerConfigs)) {
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
      this.context.ui.showMessage(`未找到目标文件: ${targetFilePath}，已回退到当前文档`, 'warning');
    }

    return { filePath: activeFilePath, content: activeContent, cursor, selection, scope, targetFilePath };
  }

  async sendMessage(text: string) {
    if (!text.trim() || this.state.isLoading) return;

    const t = getT();

    const intent = parseIntent(text);
    const hasSelection = Boolean(this.context.editor.getSelection());
    // For slash commands, use the command's intended target scope;
    // for /scope command, use parsed target; otherwise fall back to editScope.
    const isSlashCommand = text.trim().startsWith('/') && !text.trim().startsWith('/scope ');
    const requestedScope = text.trim().startsWith('/scope ')
      ? intent.target
      : isSlashCommand
        ? intent.target
        : this.state.editScope;
    const effectiveScope = getEffectiveScope(requestedScope, hasSelection);
    const editorCtx = await this.captureContext(effectiveScope, intent.params.targetFilePath);

    // Add user message
    const userMsg: CopilotMessage = {
      id: this.nextId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Add streaming assistant message placeholder
    const assistantMsg: CopilotMessage = {
      id: this.nextId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const maxHistory = this.config?.general?.maxHistoryLength ?? 50;
    const trimmedHistory = this.state.messages.slice(-(maxHistory - 2));
    this.setState({
      messages: [...trimmedHistory, userMsg, assistantMsg],
      isLoading: true,
      editScope: effectiveScope,
    });

    try {
      const systemPrompt = buildSystemPrompt(editorCtx);
      const userPrompt = buildChatPrompt(intent, editorCtx);

      const chatMessages: AIChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const assistantId = assistantMsg.id;

      const fullResponse = await this.router.chat(
        chatMessages,
        (chunk) => {
          // Update the streaming message with each chunk
          const msgs = this.state.messages.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          );
          this.setState({ messages: msgs });
        },
        this.state.selectedProvider || undefined,
      );

      // Build actions if the response contains modified text

      // ── create_document: open a new untitled tab with the generated content ──
      if (intent.action === 'create_document') {
        const newDocContent = extractModifiedText(fullResponse) ?? fullResponse;
        const finalMsgs = this.state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: fullResponse, isStreaming: false } : m,
        );
        this.setState({ messages: finalMsgs, isLoading: false });

        if (!newDocContent.trim()) {
          this.context.ui.showMessage(t('aiCopilot.panel.newDocEmpty'), 'warning');
          return;
        }

        try {
          this.context.workspace.createNewDoc(newDocContent);
          this.context.ui.showMessage(t('aiCopilot.panel.newDocCreated'), 'info');
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          this.context.ui.showMessage(t('aiCopilot.panel.newDocCreateFailed', { reason }), 'error');
        }
        return;
      }

      // Build actions if the response contains modified text
      const actions = this.buildActions(fullResponse, editorCtx, effectiveScope);

      const isBypass = this.config?.general?.applyMode === 'bypass';

      if (isBypass && actions.length > 0) {
        // Bypass mode: apply immediately, no confirmation buttons
        const finalMsgs = this.state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: fullResponse, isStreaming: false } : m,
        );
        this.setState({ messages: finalMsgs, isLoading: false });
        let appliedCount = 0;
        for (const action of actions) {
          if (this.tryApplyAction(action)) {
            appliedCount += 1;
          }
        }
        if (appliedCount === actions.length) {
          this.context.ui.showMessage(t('aiCopilot.panel.autoApplied'), 'info');
        } else if (appliedCount > 0) {
          this.context.ui.showMessage(
            t('aiCopilot.panel.autoAppliedPartial', { appliedCount, totalCount: actions.length }),
            'warning',
          );
        } else {
          this.context.ui.showMessage(t('aiCopilot.panel.autoApplyFailed'), 'warning');
        }
      } else {
        // Default mode: show Apply/Discard buttons
        const finalMsgs = this.state.messages.map((m) =>
          m.id === assistantId
            ? { ...m, content: fullResponse, isStreaming: false, actions }
            : m,
        );
        this.setState({ messages: finalMsgs, isLoading: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
    const finalMsgs = this.state.messages.map((m) =>
        m.id === assistantMsg.id
          ? { ...m, content: '', isStreaming: false, error: errorMessage }
          : m,
      );
      this.setState({ messages: finalMsgs, isLoading: false });
    }
  }

  stopGeneration() {
    this.router.abort();
    const finalMsgs = this.state.messages.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m,
    );
    this.setState({ messages: finalMsgs, isLoading: false });
  }

  private buildActions(response: string, editorCtx: EditorContext, scope: EditScopeMode): EditAction[] {
    const modified = extractModifiedText(response);
    if (!modified) return [];
    if (scope === 'workspace') return [];

    if (editorCtx.selection) {
      return [
        {
          id: this.nextId(),
          type: 'replace',
          description: '替换选中文本',
          from: editorCtx.selection.from,
          to: editorCtx.selection.to,
          originalText: editorCtx.selection.text,
          newText: modified,
          sourceFilePath: editorCtx.filePath,
        },
      ];
    }

    return createMarkdownSectionActions({
      original: editorCtx.content,
      modified,
      baseFrom: 0,
      filePath: editorCtx.filePath,
      idFactory: () => this.nextId(),
    });
  }

  applyAction(action: EditAction, successMessage = '已应用修改') {
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
    const currentPath = this.context.editor.getActiveFilePath();
    if (action.sourceFilePath && currentPath !== action.sourceFilePath) {
      this.context.workspace.openFile(action.sourceFilePath);
      this.context.ui.showMessage('检测到文件已切换，已跳转回建议来源文件，请再次点击应用', 'warning');
      return false;
    }

    const validation = validateActionAgainstCurrentContent(action, this.context.editor.getContent());
    if (!validation.valid) {
      this.context.ui.showMessage('文档已变化，当前建议已过期，请重新生成。', 'warning');
      return false;
    }

    this.context.editor.replaceRange(action.from, action.to, action.newText);
    return true;
  }

  toggleApplyMode() {
    if (!this.config) return;
    const current = this.config.general?.applyMode ?? 'default';
    const next: 'default' | 'bypass' = current === 'default' ? 'bypass' : 'default';
    this.config = { ...this.config, general: { ...this.config.general, applyMode: next } };
    saveConfig(this.context.storage, this.config);
    this.notify();
  }

  discardAction(actionId: string) {
    const msgs = this.state.messages.map((m) => ({
      ...m,
      actions: m.actions?.filter((a) => a.id !== actionId),
    }));
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
    if (!providerConfig.apiKey) {
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

  setSelectedProvider(provider: string) {
    this.setState({ selectedProvider: provider });
    if (this.config) {
      const updated = { ...this.config, activeProvider: provider };
      this.config = updated;
      saveConfig(this.context.storage, updated);
    }
  }

  setEditScope(scope: EditScopeMode) {
    this.setState({ editScope: scope });
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

      const handleSend = useCallback(() => {
        if (!input.trim()) return;
        const text = input;
        setInput('');
        setShowSlashPopup(false);
        self.sendMessage(text);
      }, [input]);

      const handleInputChange = useCallback((value: string) => {
        setInput(value);
        // Show slash popup when input starts with /
        if (value.startsWith('/')) {
          setShowSlashPopup(true);
          setSlashFilter(value);
          setSlashSelectedIndex(0);
        } else {
          setShowSlashPopup(false);
        }
      }, []);

      const handleSlashSelect = useCallback((command: string) => {
        setInput(command);
        setShowSlashPopup(false);
        inputRef.current?.focus();
      }, []);

      const { messages, isLoading, selectedProvider, editScope } = self.state;

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
              onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (showSlashPopup) {
                  const count = getFilteredCommandCount(slashFilter);
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSlashSelectedIndex((prev) => (prev + 1) % count);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSlashSelectedIndex((prev) => (prev <= 0 ? count - 1 : prev - 1));
                    return;
                  }
                  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                    const idx = slashSelectedIndex >= 0 ? slashSelectedIndex : 0;
                    e.preventDefault();
                    const cmd = getFilteredCommandAt(slashFilter, idx);
                    if (cmd) {
                      handleSlashSelect(cmd + ' ');
                    }
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
                createElement(
                  'button',
                  {
                    onClick: () => {
                      const order: EditScopeMode[] = ['selection', 'document', 'tab', 'workspace'];
                      const idx = order.indexOf(editScope);
                      const next = order[(idx + 1) % order.length];
                      self.setEditScope(next);
                    },
                    title: t('aiCopilot.scope.tooltip', { scope: editScope }),
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      height: '16px',
                      padding: '0 6px',
                      border: '1px solid var(--border-color, #444)',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: 'var(--text-muted, #666)',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.4px',
                      cursor: 'pointer',
                      userSelect: 'none' as const,
                      flexShrink: 0,
                    },
                  },
                  editScope === 'selection'
                    ? t('aiCopilot.scope.selection')
                    : editScope === 'document'
                      ? t('aiCopilot.scope.document')
                      : editScope === 'tab'
                        ? t('aiCopilot.scope.tab')
                        : t('aiCopilot.scope.workspace'),
                ),
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
                        width: '24px',
                        height: '24px',
                        border: 'none',
                        borderRadius: '4px',
                        background: 'var(--error-color, #e55)',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                      },
                    },
                    createElement(Square, { size: 10, fill: 'currentColor' }),
                  )
                : createElement(
                    'button',
                    {
                      onClick: handleSend,
                      disabled: !input.trim(),
                      title: t('aiCopilot.panel.send'),
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        border: 'none',
                        borderRadius: '4px',
                        background: !input.trim()
                          ? 'transparent'
                          : 'var(--accent-color, #4a9eff)',
                        color: !input.trim() ? 'var(--text-muted, #555)' : '#fff',
                        cursor: !input.trim() ? 'default' : 'pointer',
                        padding: 0,
                      },
                    },
                    createElement(ArrowUp, { size: 14 }),
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
