import { ProviderRouter } from './providers/router';
import { OllamaProvider } from './providers/ollama';
import { OpenAICompatibleProvider } from './providers/openai-compatible';
import { buildProviderConfig } from './config-store';
import type { AIConfig } from './config-store';
import type { ProviderConfig } from './providers/types';

export function setupProviders(router: ProviderRouter, config: AIConfig) {
  const providerIds = new Set([config.activeProvider, ...Object.keys(config.providerConfigs)]);
  for (const id of providerIds) {
    const userConfig = config.providerConfigs[id];
    const pc = buildProviderConfig(id, userConfig);
    if (!pc) continue;
    if (id === 'ollama') {
      router.addProvider(pc, new OllamaProvider());
    } else {
      router.addProvider(pc, new OpenAICompatibleProvider(id));
    }
  }
}

export async function testConnection(providerConfig: ProviderConfig): Promise<{ success: boolean; error?: string }> {
  if (providerConfig.type === 'cloud' && !providerConfig.apiKey) {
    return { success: false, error: 'API Key is required' };
  }
  if (!providerConfig.baseUrl) {
    return { success: false, error: 'Base URL is required' };
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
      return { success: false, error: 'Health check returned false (provider may be down)' };
    }
  } catch (err) {
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
    return { success: false, error: errorMessage };
  }
}
