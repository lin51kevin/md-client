import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAICompatibleProvider } from '../../../plugins/official/ai-copilot/src/providers/openai-compatible';
import { OllamaProvider } from '../../../plugins/official/ai-copilot/src/providers/ollama';
import { ProviderRouter } from '../../../plugins/official/ai-copilot/src/providers/router';

describe('Provider abort()', () => {
  describe('OpenAICompatibleProvider', () => {
    it('abort() cancels an in-flight request', async () => {
      const provider = new OpenAICompatibleProvider('test');
      provider.configure({
        provider: 'test',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4',
        priority: 1,
        enabled: true,
      });

      // Mock fetch that hangs (never resolves on its own)
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            (init?.signal as AbortSignal)?.addEventListener('abort', () =>
              reject(new DOMException('The operation was aborted.', 'AbortError')),
            );
          }),
      );

      const chatPromise = provider.chat([{ role: 'user', content: 'hi' }]);
      // Abort immediately
      provider.abort();
      await expect(chatPromise).rejects.toThrow();
      fetchSpy.mockRestore();
    });

    it('abort() is safe to call when no request is active', () => {
      const provider = new OpenAICompatibleProvider('test');
      expect(() => provider.abort()).not.toThrow();
    });
  });

  describe('OllamaProvider', () => {
    it('abort() cancels an in-flight request', async () => {
      const provider = new OllamaProvider();
      provider.configure({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'qwen2.5',
        priority: 1,
        enabled: true,
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            (init?.signal as AbortSignal)?.addEventListener('abort', () =>
              reject(new DOMException('The operation was aborted.', 'AbortError')),
            );
          }),
      );

      const chatPromise = provider.chat([{ role: 'user', content: 'hi' }]);
      provider.abort();
      await expect(chatPromise).rejects.toThrow();
      fetchSpy.mockRestore();
    });

    it('abort() is safe to call when no request is active', () => {
      const provider = new OllamaProvider();
      expect(() => provider.abort()).not.toThrow();
    });
  });
});

describe('ProviderRouter abort()', () => {
  it('delegates abort() to the active provider', async () => {
    const router = new ProviderRouter();
    let resolveChatFn: (v: string) => void;
    const mockProvider = {
      name: 'mock',
      supportsStreaming: true,
      configure: vi.fn(),
      chat: vi.fn(
        () => new Promise<string>((resolve) => { resolveChatFn = resolve; }),
      ),
      healthCheck: vi.fn(async () => true),
      abort: vi.fn(),
    };

    router.addProvider(
      { provider: 'mock', type: 'cloud', priority: 1, enabled: true },
      mockProvider,
    );

    // Start chat (don't await)
    const chatPromise = router.chat([{ role: 'user', content: 'hi' }]);
    // Wait a microtask so the provider's chat is entered
    await Promise.resolve();

    router.abort();
    expect(mockProvider.abort).toHaveBeenCalled();

    // Resolve so the promise settles and the test doesn't hang
    resolveChatFn!('done');
    await chatPromise;
  });

  it('abort() is safe when no chat is in progress', () => {
    const router = new ProviderRouter();
    expect(() => router.abort()).not.toThrow();
  });
});
