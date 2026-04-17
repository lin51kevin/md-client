/** AI Provider types for the AI Copilot plugin. */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string; // for tool responses
}

export type EditScopeMode = 'selection' | 'cursor' | 'document' | 'tab' | 'workspace' | 'section';

export interface ProviderConfig {
  type: 'cloud' | 'local';
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  priority: number;
  enabled: boolean;
  timeout?: number;
  /** Extra headers sent with every request (e.g. HTTP-Referer for OpenRouter). */
  customHeaders?: Record<string, string>;
}

/** Tool definition for function calling (OpenAI format) */
export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Tool call from AI */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface AIProvider {
  readonly name: string;
  readonly supportsStreaming: boolean;
  /** Whether this provider supports function calling */
  readonly supportsTools?: boolean;

  configure(config: ProviderConfig): void;
  chat(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<string>;
  
  /**
   * Chat with tool calling support.
   * Returns content and any tool calls made by the AI.
   */
  chatWithTools?(
    messages: ChatMessage[],
    tools: ToolDef[],
    onChunk?: (chunk: string) => void
  ): Promise<{ content: string; toolCalls?: ToolCall[] }>;
  
  healthCheck(): Promise<boolean>;
  /** Abort the current in-flight chat request, if any. */
  abort?(): void;
}

export interface EditAction {
  id: string;
  type: 'replace' | 'insert' | 'delete';
  description: string;
  from: number;
  to: number;
  originalText: string;
  newText: string;
  sourceFilePath: string | null;
}

export interface EditorContext {
  filePath: string | null;
  content: string;
  cursor: { line: number; column: number; offset: number };
  selection?: { from: number; to: number; text: string };
  scope?: EditScopeMode;
  targetFilePath?: string;
  workspaceFiles?: Array<{ path: string; content: string }>;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  actions?: EditAction[];
  error?: string;
  stopped?: boolean;
  isStreaming?: boolean;
  /** Parsed action type for this reply - used to show low-confidence hints. */
  intentAction?: string;
  /** Confidence score [0,1] from the intent parser. */
  intentConfidence?: number;
  /** Tool calls made by the assistant (for Agent mode) */
  toolCalls?: ToolCall[];
  /** Name of the tool (for tool responses) */
  name?: string;
}

export interface CopilotState {
  messages: CopilotMessage[];
  isLoading: boolean;
  selectedProvider: string;
  /** Whether currently in Agent mode */
  isAgentMode?: boolean;
}

/** Agent execution result */
export interface AgentExecutionResult {
  success: boolean;
  finalContent: string;
  iterations: number;
  toolCalls: ToolCall[];
}
