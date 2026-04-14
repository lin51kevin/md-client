import { createElement, useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Settings, ArrowUp, Loader, X } from 'lucide-react';
import type { PluginContext } from '../../../plugin-sandbox';
import type {
  CopilotMessage,
  CopilotState,
  EditAction,
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
import { ChatMessageView } from './ChatMessage';
import { SlashCommandPopup } from './QuickCommands';
import { ModelSelectorView } from './ModelSelector';
import { SettingsViewComponent } from './SettingsView';
import { useI18n } from '../../../i18n';

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
    this.state = { messages: [], isLoading: false, selectedProvider: '' };
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

  private captureContext(): EditorContext {
    const content = this.context.editor.getContent();
    const cursor = this.context.editor.getCursorPosition();
    const selection = this.context.editor.getSelection() ?? undefined;
    const filePath = this.context.editor.getActiveFilePath();
    return { filePath, content, cursor, selection };
  }

  async sendMessage(text: string) {
    if (!text.trim() || this.state.isLoading) return;

    const editorCtx = this.captureContext();
    const intent = parseIntent(text);

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
      const actions = this.buildActions(fullResponse, editorCtx);

      // Finalize the assistant message
      const finalMsgs = this.state.messages.map((m) =>
        m.id === assistantId
          ? { ...m, content: fullResponse, isStreaming: false, actions }
          : m,
      );
      this.setState({ messages: finalMsgs, isLoading: false });
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

  private buildActions(response: string, editorCtx: EditorContext): EditAction[] {
    const modified = extractModifiedText(response);
    if (!modified) return [];

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
        },
      ];
    }

    // No selection: insert at cursor rather than replacing the whole document
    const offset = editorCtx.cursor.offset;
    return [
      {
        id: this.nextId(),
        type: 'insert',
        description: '在光标处插入 AI 生成内容（无选区时请先选中要替换的文本）',
        from: offset,
        to: offset,
        originalText: '',
        newText: modified,
      },
    ];
  }

  applyAction(action: EditAction, successMessage = '已应用修改') {
    this.context.editor.replaceRange(action.from, action.to, action.newText);
    this.context.ui.showMessage(successMessage, 'info');

    // Remove the action from messages
    const msgs = this.state.messages.map((m) => ({
      ...m,
      actions: m.actions?.filter((a) => a.id !== action.id),
    }));
    this.setState({ messages: msgs });
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
    console.info(`[AI] Testing connection: provider=${providerConfig.provider}, baseUrl=${providerConfig.baseUrl}, model=${providerConfig.model}`);
    
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
      console.info(`[AI] Test connection result: ${result ? 'OK' : 'FAILED'}`);
      
      if (result) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Health check returned false (provider may be down)' 
        };
      }
      
    } catch (err) {
      console.warn(`[AI] Test connection error:`, err);
      
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

  /** Returns a React function component for the sidebar renderer. */
  render() {
    const self = this;

    function AICopilotPanel() {
      const [, forceUpdate] = useState(0);
      const [showSettings, setShowSettings] = useState(false);
      const [input, setInput] = useState('');
      const [showSlashPopup, setShowSlashPopup] = useState(false);
      const [slashFilter, setSlashFilter] = useState('');
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
        } else {
          setShowSlashPopup(false);
        }
      }, []);

      const handleSlashSelect = useCallback((command: string) => {
        setInput(command);
        setShowSlashPopup(false);
        inputRef.current?.focus();
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
            'Chat',
          ),
          createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
            // New chat
            createElement(
              'button',
              {
                onClick: () => self.clearHistory(),
                title: 'New Chat',
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
                title: 'Settings',
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
                    title: 'Close (Ctrl+Alt+I)',
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
                  'Ask a question or use ',
                  createElement('code', { style: { fontSize: '12px', color: 'var(--accent-color, #4a9eff)' } }, '/'),
                  ' commands to get started.',
                ),
              )
            : null,
          // Message list
          ...messages.map((msg) =>
            createElement(ChatMessageView, {
              key: msg.id,
              message: msg,
              onApply: (action: EditAction) => self.applyAction(action),
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
                  'Tip: Use ',
                  createElement(
                    'code',
                    { style: { color: 'var(--accent-color, #4a9eff)', fontSize: '11px' } },
                    '/explain',
                  ),
                  ' to explain selected text.',
                )
              : null,
            // Slash command popup
            showSlashPopup
              ? createElement(SlashCommandPopup, {
                  filter: slashFilter,
                  onSelect: handleSlashSelect,
                })
              : null,
            // Textarea (borderless)
            createElement('textarea', {
              ref: inputRef,
              value: input,
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange(e.target.value),
              onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
                if (e.key === 'Escape') {
                  setShowSlashPopup(false);
                }
              },
              placeholder: 'Describe what to build...',
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
              // Model selector
              createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
                self.config
                  ? createElement(ModelSelectorView, {
                      config: self.config,
                      activeProvider: selectedProvider,
                      onSelect: (p: string) => self.setSelectedProvider(p),
                    })
                  : null,
              ),
              // Send button
              createElement(
                'button',
                {
                  onClick: handleSend,
                  disabled: !input.trim() || isLoading,
                  title: 'Send (Enter)',
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    border: 'none',
                    borderRadius: '4px',
                    background:
                      !input.trim() || isLoading
                        ? 'transparent'
                        : 'var(--accent-color, #4a9eff)',
                    color: !input.trim() || isLoading ? 'var(--text-muted, #555)' : '#fff',
                    cursor: !input.trim() || isLoading ? 'default' : 'pointer',
                    padding: 0,
                  },
                },
                isLoading
                  ? createElement(Loader, { size: 14, style: { animation: 'spin 1s linear infinite' } })
                  : createElement(ArrowUp, { size: 14 }),
              ),
            ),
          ),
        ),
      );
    }

    return AICopilotPanel;
  }
}
