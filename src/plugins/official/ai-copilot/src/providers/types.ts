/** AI Provider types for the AI Copilot plugin. */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

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

export interface AIProvider {
  readonly name: string;
  readonly supportsStreaming: boolean;

  configure(config: ProviderConfig): void;
  chat(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<string>;
  healthCheck(): Promise<boolean>;
}

export interface EditAction {
  id: string;
  type: 'replace' | 'insert' | 'delete';
  description: string;
  from: number;
  to: number;
  originalText: string;
  newText: string;
}

export interface EditorContext {
  filePath: string | null;
  content: string;
  cursor: { line: number; column: number; offset: number };
  selection?: { from: number; to: number; text: string };
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: EditAction[];
  error?: string;
  isStreaming?: boolean;
}

export interface CopilotState {
  messages: CopilotMessage[];
  isLoading: boolean;
  selectedProvider: string;
}
