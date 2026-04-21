import type { AIProvider, ChatMessage, ProviderConfig } from './types';

/**
 * Ollama local model provider.
 * Connects to a locally running Ollama instance.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly supportsStreaming = true;

  private baseUrl = 'http://localhost:11434';
  private model = 'qwen2.5';
  private timeout = 60000;
  private controller: AbortController | null = null;

  configure(config: ProviderConfig): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    if (config.model) this.model = config.model;
    if (config.timeout) this.timeout = config.timeout;
  }

  async chat(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<string> {
    const useStream = Boolean(onChunk);
    const controller = new AbortController();
    this.controller = controller;
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: useStream,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
      }

      if (!useStream) {
        const data = await response.json();
        return data.message?.content ?? '';
      }

      // Streaming mode
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Ollama: no response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                fullContent += data.message.content;
                onChunk?.(data.message.content);
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      } finally {
        try { await reader.cancel(); } catch { /* ignore */ }
      }

      return fullContent;
    } finally {
      this.controller = null;
      clearTimeout(timeoutId);
    }
  }

  abort(): void {
    this.controller?.abort();
    this.controller = null;
  }

  async healthCheck(): Promise<boolean> {
    const url = `${this.baseUrl}/api/tags`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        console.warn(`[AI ollama] Health check failed: HTTP ${response.status} ${url}`);
      }
      return response.ok;
    } catch (err) {
      console.warn(`[AI ollama] Health check error: ${url}`, err);
      return false;
    }
  }
}
