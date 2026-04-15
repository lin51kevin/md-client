/**
 * useAISelection — hook for processing selected text with AI.
 *
 * Reads AI provider config from localStorage (same config used by the
 * AI Copilot plugin) and calls the OpenAI-compatible chat completions API.
 */
import { useState, useCallback, useRef } from 'react';
import { AI_PROMPTS, type AIAction } from '../lib/ai-prompts';

export type { AIAction } from '../lib/ai-prompts';

interface UseAISelectionOptions {
  apiEndpoint: string;
  apiKey: string;
  onResult: (result: string) => void;
  onChunk?: (chunk: string) => void;
}

interface AIConfigEntry {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

/**
 * Load the active AI provider config from localStorage.
 * The AI Copilot plugin stores its config under 'ai-config'.
 */
function loadAIProviderConfig(): { baseUrl: string; apiKey: string; model: string } {
  try {
    const raw = localStorage.getItem('ai-config');
    if (!raw) return { baseUrl: '', apiKey: '', model: '' };
    const config = JSON.parse(raw) as {
      activeProvider: string;
      providerConfigs: Record<string, AIConfigEntry>;
    };
    const entry = config.providerConfigs[config.activeProvider];
    return {
      baseUrl: entry?.baseUrl?.replace(/\/+$/, '') ?? '',
      apiKey: entry?.apiKey ?? '',
      model: entry?.model ?? '',
    };
  } catch {
    return { baseUrl: '', apiKey: '', model: '' };
  }
}

/**
 * Build the chat messages for a given action and selected text.
 */
function buildMessages(action: AIAction, text: string) {
  const prompt = AI_PROMPTS[action];
  return [
    { role: 'system' as const, content: prompt.system },
    { role: 'user' as const, content: prompt.user(text) },
  ];
}

export function useAISelection({
  apiEndpoint: fallbackEndpoint,
  apiKey: fallbackApiKey,
  onResult,
  onChunk,
}: UseAISelectionOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const processSelection = useCallback(
    async (text: string, action: AIAction) => {
      setError(null);
      setLoading(true);

      // Prefer localStorage config (AI Copilot settings), fall back to props
      const stored = loadAIProviderConfig();
      const baseUrl = stored.baseUrl || fallbackEndpoint.replace(/\/+$/, '');
      const apiKey = stored.apiKey || fallbackApiKey;
      const model = stored.model || '';

      if (!apiKey) {
        setError('API Key 未配置，请在 AI Copilot 设置中配置。');
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      const messages = buildMessages(action, text);
      const useStream = Boolean(onChunk);

      try {
        const body: Record<string, unknown> = {
          model,
          messages,
          stream: useStream,
        };

        // If model is empty, omit it (let the server decide)
        if (!model) delete body.model;

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(`AI 请求失败 (HTTP ${response.status}): ${detail}`);
        }

        if (!useStream) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content ?? '';
          onResult(content);
        } else {
          // SSE streaming
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body for streaming');

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

          onResult(fullContent);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        controllerRef.current = null;
      }
    },
    [fallbackEndpoint, fallbackApiKey, onResult, onChunk],
  );

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
  }, []);

  return { processSelection, loading, error, abort };
}
