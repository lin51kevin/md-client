import type { StorageAPI } from '../../../plugin-sandbox';
import type { ProviderConfig } from './providers/types';
import { getPreset } from './providers/provider-registry';

const CONFIG_KEY = 'ai-config';

/** Per-provider user overrides (API key, model, base URL, etc.). */
export interface ProviderUserConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  customHeaders?: Record<string, string>;
  /** Set to true once the user has run "Test Connection" and it passed. */
  verified?: boolean;
}

export interface AIConfig {
  /** Currently selected provider ID from the registry. */
  activeProvider: string;
  /** User overrides keyed by provider ID. */
  providerConfigs: Record<string, ProviderUserConfig>;
  general: {
    maxHistoryLength: number;
    /**
     * 'default'  — AI responses show Apply/Discard buttons (manual approval).
     * 'bypass'   — AI edits are applied to the editor immediately without confirmation.
     */
    applyMode: 'default' | 'bypass';
  };
}

const DEFAULT_CONFIG: AIConfig = {
  activeProvider: 'ollama',
  providerConfigs: {},
  general: {
    maxHistoryLength: 50,
    applyMode: 'default',
  },
};

/**
 * Build a ProviderConfig for the router by merging a registry preset
 * with the user's overrides. Unknown provider IDs fall back to the
 * 'custom' (OpenAI-compatible) preset so any endpoint can be used.
 */
export function buildProviderConfig(
  providerId: string,
  userConfig?: ProviderUserConfig,
): ProviderConfig | null {
  const preset = getPreset(providerId) ?? getPreset('custom');
  if (!preset) return null;
  return {
    type: preset.type,
    provider: providerId,
    apiKey: userConfig?.apiKey,
    baseUrl: userConfig?.baseUrl || preset.baseUrl,
    model: userConfig?.model || preset.defaultModel,
    priority: 1,
    enabled: true,
    customHeaders: { ...preset.defaultHeaders, ...userConfig?.customHeaders },
  };
}

/** Migrate legacy config format (providers array) to the new structure. */
function migrateConfig(raw: Record<string, unknown>): AIConfig {
  if (Array.isArray(raw.providers)) {
    const legacyProviders = raw.providers as Array<Record<string, unknown>>;
    const providerConfigs: Record<string, ProviderUserConfig> = {};
    for (const lp of legacyProviders) {
      const id = lp.provider as string;
      if (!id) continue;
      providerConfigs[id] = {
        apiKey: (lp.apiKey as string) ?? undefined,
        baseUrl: (lp.baseUrl as string) ?? undefined,
        model: (lp.model as string) ?? undefined,
        customHeaders: (lp.customHeaders as Record<string, string>) ?? undefined,
      };
    }
    return {
      activeProvider: (raw.activeProvider as string) || DEFAULT_CONFIG.activeProvider,
      providerConfigs,
      general: { ...DEFAULT_CONFIG.general, ...(raw.general as Partial<AIConfig['general']>) },
    };
  }
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    providerConfigs: (raw.providerConfigs as Record<string, ProviderUserConfig>) ?? {},
    general: { ...DEFAULT_CONFIG.general, ...(raw.general as Partial<AIConfig['general']> | undefined) },
  };
}

export async function loadConfig(storage: StorageAPI): Promise<AIConfig> {
  try {
    const raw = await storage.get(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return migrateConfig(JSON.parse(raw));
  } catch (err) {
    console.error('[AI Copilot] Failed to load config, using defaults:', err);
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(storage: StorageAPI, config: AIConfig): Promise<void> {
  await storage.set(CONFIG_KEY, JSON.stringify(config));
}

export function getDefaultConfig(): AIConfig {
  return { ...DEFAULT_CONFIG };
}
