import type { AIProvider, ChatMessage, ProviderConfig } from './types';

/**
 * Routes AI requests to the highest-priority available provider.
 * Falls back to the next provider on failure.
 */
export class ProviderRouter {
  private providers: Map<string, AIProvider> = new Map();
  private configs: ProviderConfig[] = [];
  private activeProvider: AIProvider | null = null;

  addProvider(config: ProviderConfig, provider: AIProvider): void {
    provider.configure(config);
    this.providers.set(config.provider, provider);
    // Replace existing config entry for same provider (prevent duplicates on re-configure)
    const withoutExisting = this.configs.filter((c) => c.provider !== config.provider);
    this.configs = [...withoutExisting, config].sort((a, b) => a.priority - b.priority);
  }

  removeProvider(name: string): void {
    this.providers.delete(name);
    this.configs = this.configs.filter((c) => c.provider !== name);
  }

  getProviderNames(): string[] {
    return this.configs.filter((c) => c.enabled).map((c) => c.provider);
  }

  getActiveProvider(): string | null {
    const active = this.configs.find((c) => c.enabled && this.providers.has(c.provider));
    return active?.provider ?? null;
  }

  /**
   * Send a chat request, falling back through providers by priority.
   */
  async chat(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    preferredProvider?: string,
  ): Promise<string> {
    const ordered = preferredProvider
      ? [
          ...this.configs.filter((c) => c.provider === preferredProvider),
          ...this.configs.filter((c) => c.provider !== preferredProvider),
        ]
      : this.configs;

    const errors: Array<{ provider: string; error: unknown }> = [];

    for (const config of ordered) {
      if (!config.enabled) continue;
      const provider = this.providers.get(config.provider);
      if (!provider) continue;

      try {
        this.activeProvider = provider;
        return await provider.chat(messages, onChunk);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        errors.push({ provider: config.provider, error });
        console.warn(`[AI Router] Provider "${config.provider}" failed:`, error);
      } finally {
        this.activeProvider = null;
      }
    }

    const summary = errors.map((e) => `${e.provider}: ${e.error}`).join('; ');
    throw new Error(`All AI providers failed. ${summary}`);
  }

  /**
   * Abort the current in-flight chat request, if any.
   */
  abort(): void {
    this.activeProvider?.abort?.();
    this.activeProvider = null;
  }

  /**
   * Health check on a specific provider or the active one.
   */
  async healthCheck(providerName?: string): Promise<boolean> {
    const name = providerName ?? this.getActiveProvider();
    if (!name) return false;
    const provider = this.providers.get(name);
    if (!provider) return false;

    try {
      return await provider.healthCheck();
    } catch {
      return false;
    }
  }
}
