import type { AIProvider, ChatMessage, ProviderConfig } from './types';

/**
 * OpenAI-compatible provider.
 * Works with OpenAI, Azure OpenAI, Anthropic (via proxy), and any
 * service that implements the OpenAI chat completions API.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  readonly supportsStreaming = true;

  private baseUrl = 'https://api.openai.com/v1';
  private apiKey = '';
  private model = 'gpt-4o';
  private timeout = 60000;
  private customHeaders: Record<string, string> = {};

  constructor(name = 'openai') {
    this.name = name;
  }

  configure(config: ProviderConfig): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    if (config.apiKey) this.apiKey = config.apiKey.trim();
    if (config.model) this.model = config.model;
    if (config.timeout) this.timeout = config.timeout;
    if (config.customHeaders) this.customHeaders = config.customHeaders;
  }

  async chat(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<string> {
    if (!this.apiKey) throw new Error(`${this.name}: API key not configured`);

    const useStream = Boolean(onChunk);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.customHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: useStream,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail = await response.text().catch(() => '');
        if (response.status === 401) {
          const hints: string[] = [
            'API Key 可能无效或已过期',
            'API Key 可能没有访问该模型的权限',
            '账户余额可能已用完（检查余额/Credits）',
            `当前模型: ${this.model}`,
          ];
          if (this.name === 'openrouter') {
            hints.push('OpenRouter 免费模型请使用带 :free 后缀的 ID，如 meta-llama/llama-3.3-70b-instruct:free');
          }
          try {
            const errBody = JSON.parse(detail);
            if (errBody?.error?.message) hints.unshift(errBody.error.message);
          } catch { /* non-JSON body */ }
          throw new Error(`${this.name} 认证失败 (HTTP 401)\n${hints.map(h => '• ' + h).join('\n')}`);
        }
        throw new Error(`${this.name} HTTP ${response.status}: ${detail}`);
      }

      if (!useStream) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? '';
      }

      // SSE streaming mode
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
              onChunk?.(delta);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      return fullContent;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn(`[AI ${this.name}] Health check skipped: no API key configured`);
      return false;
    }
    const url = `${this.baseUrl}/models`;
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, ...this.customHeaders },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.warn(`[AI ${this.name}] Health check failed: HTTP ${response.status} ${url}`, body);
      }
      return response.ok;
    } catch (err) {
      console.warn(`[AI ${this.name}] Health check error: ${url}`, err);
      return false;
    }
  }
}
