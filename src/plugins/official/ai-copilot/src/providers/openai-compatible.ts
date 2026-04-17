import type { AIProvider, ChatMessage, ProviderConfig, ToolDef, ToolCall } from './types';

/**
 * OpenAI-compatible provider.
 * Works with OpenAI, Azure OpenAI, Anthropic (via proxy), and any
 * service that implements the OpenAI chat completions API.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  readonly supportsStreaming = true;
  readonly supportsTools = true;

  private baseUrl = 'https://api.openai.com/v1';
  private apiKey = '';
  private model = 'gpt-4o';
  private timeout = 60000;
  private customHeaders: Record<string, string> = {};
  private controller: AbortController | null = null;

  constructor(name = 'openai') {
    this.name = name;
  }

  configure(config: ProviderConfig): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    if (config.apiKey) this.apiKey = config.apiKey.trim().replace(/[\r\n\t]/g, '');
    if (config.model) this.model = config.model;
    if (config.timeout) this.timeout = config.timeout;
    if (config.customHeaders) this.customHeaders = config.customHeaders;
  }

  async chat(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<string> {
    const result = await this.chatWithTools(messages, [], onChunk);
    return result.content;
  }

  async chatWithTools(
    messages: ChatMessage[],
    tools: ToolDef[],
    onChunk?: (chunk: string) => void
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }
    if (this.name === 'openrouter' && !this.apiKey.startsWith('sk-or-v1-')) {
      throw new Error(`OpenRouter API Key 格式错误，必须以 sk-or-v1- 开头`);
    }

    const useStream = Boolean(onChunk) && tools.length === 0;
    const controller = new AbortController();
    this.controller = controller;
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const requestBody: Record<string, unknown> = {
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.name && { name: m.name }),
        })),
        stream: useStream,
      };

      if (tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.customHeaders,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail = await response.text().catch(() => '');
        if (response.status === 401) {
          const hints: string[] = [`当前模型: ${this.model}`, 'API Key 可能无效或已过期'];
          try {
            const errBody = JSON.parse(detail);
            if (errBody?.error?.message) hints.unshift(errBody.error.message);
          } catch {}
          if (this.name === 'openrouter') {
            hints.push('可尝试 :free 模型，如 meta-llama/llama-3.1-8b-instruct:free');
          }
          throw new Error(`${this.name} 认证失败 (HTTP 401)\n${hints.map((h) => '• ' + h).join('\n')}`);
        }
        throw new Error(`${this.name} HTTP ${response.status}: ${detail}`);
      }

      if (!useStream) {
        const data = await response.json();
        const message = data.choices?.[0]?.message;
        const content = message?.content ?? '';
        const toolCalls = message?.tool_calls?.map((tc: unknown) => this.parseToolCall(tc));
        return { content, toolCalls };
      }

      // SSE streaming mode - tools not supported in streaming
      return this.handleStreaming(response, onChunk!);
    } finally {
      this.controller = null;
      clearTimeout(timeoutId);
    }
  }

  private parseToolCall(tc: unknown): ToolCall {
    const call = tc as Record<string, unknown>;
    const fn = (call.function || {}) as Record<string, unknown>;
    return {
      id: String(call.id || ''),
      type: 'function',
      function: {
        name: String(fn.name || ''),
        arguments: String(fn.arguments || '{}'),
      },
    };
  }

  private async handleStreaming(
    response: Response,
    onChunk: (chunk: string) => void
  ): Promise<{ content: string; toolCalls?: undefined }> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error(`${this.name}: no response body`);

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk(delta);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    return { content: fullContent };
  }

  abort(): void {
    this.controller?.abort();
    this.controller = null;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    const url = `${this.baseUrl}/models`;
    try {
      const response = await fetch(url, {
        headers: { ...this.customHeaders, Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}