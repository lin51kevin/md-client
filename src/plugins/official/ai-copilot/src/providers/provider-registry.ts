/**
 * Provider registry — preset definitions for known AI providers.
 * Each entry contains defaults so users only need to fill in their API key.
 */

export interface ProviderPreset {
  /** Unique provider ID (used as key in config). */
  id: string;
  /** Display name shown in the UI. */
  label: string;
  /** 'cloud' requires API key, 'local' does not. */
  type: 'cloud' | 'local';
  /** Default API base URL. */
  baseUrl: string;
  /** Recommended / popular models for this provider. */
  models: string[];
  /** Default model to use. */
  defaultModel: string;
  /** Placeholder text for the API key input. */
  apiKeyPlaceholder?: string;
  /** Link to the provider's API key management page. */
  apiKeyUrl?: string;
  /** Extra headers to include in every request. */
  defaultHeaders?: Record<string, string>;
  /** Short description shown in the UI. */
  description?: string;
  /** Human-readable labels for model IDs, used in the selector UI. */
  modelLabels?: Record<string, string>;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: 'ollama',
    label: 'Ollama',
    type: 'local',
    baseUrl: 'http://localhost:11434',
    models: [
      'llama3.3:70b',  // Meta Llama 3.3 70B
      'llama3.1:70b',  // Meta Llama 3.1 70B
      'qwen2.5:14b',  // Qwen 2.5 14B
      'qwen2.5:7b',  // Qwen 2.5 7B
      'deepseek-r1',  // DeepSeek推理版
      'deepseek-coder',  // 编码专用
      'gemma3:27b',  // Google Gemma 3 27B
      'gemma2:27b',  // Google Gemma 2 27B
      'mistral-nemo',  // Mistral最新
      'phi-4',  // Microsoft Phi-4
    ],
    defaultModel: 'llama3.3:70b',  // 默认使用Llama 3.3 70B
    description: 'Local models via Ollama (including latest Llama 3.3)',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    type: 'cloud',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-4o',  // GPT-4o
      'gpt-4o-mini',  // 经济版GPT-4o
      'gpt-4.1',  // GPT-4.1
      'gpt-4.1-mini',  // 轻量版
      'gpt-4.1-nano',  // 超轻量版
      'o3-mini',  // 最新推理模型
      'gpt-4-turbo',  // GPT-4 Turbo
      'gpt-3.5-turbo',  // 经济实惠
    ],
    defaultModel: 'gpt-4o-mini',  // 默认使用经济版
    apiKeyPlaceholder: 'sk-...',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    description: 'OpenAI GPT models (including latest GPT-4.1)',
  },
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    type: 'cloud',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      'claude-3.5-sonnet-20240620',  // Claude 3.5 Sonnet
      'claude-3.5-haiku-20241022',  // Claude快速版
      'claude-3-opus-20240229',  // Claude 3 Opus
      'claude-sonnet-4-20250514',  // Claude Sonnet 4
      'claude-3.7-sonnet',  // 最新Claude 3.7
    ],
    defaultModel: 'claude-3.5-sonnet-20240620',  // 默认使用Claude 3.5 Sonnet
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Anthropic Claude models (including Claude 3.5)',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    type: 'cloud',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      // ── 免费模型（已在 2026-04 验证可用）──────────────────────────────
      'meta-llama/llama-3.3-70b-instruct:free',       // Llama 3.3 70B
      'qwen/qwen3-next-80b-a3b-instruct:free',         // Qwen3 Next 80B
      'qwen/qwen3-coder:free',                         // Qwen3 Coder 480B
      'z-ai/glm-4.5-air:free',                         // GLM-4.5 Air
      'minimax/minimax-m2.5:free',                     // MiniMax M2.5
      'google/gemma-3-27b-it:free',                    // Gemma 3 27B
      'openai/gpt-oss-120b:free',                      // GPT-OSS 120B

      // ── 热门国产付费模型 ────────────────────────────────────────────────
      'deepseek/deepseek-v3.2',                        // DeepSeek V3.2
      'deepseek/deepseek-r1',                          // DeepSeek R1
      'deepseek/deepseek-r1-0528',                     // DeepSeek R1 (0528)
      'deepseek/deepseek-chat',                        // DeepSeek V3
      'qwen/qwen3-max',                                // Qwen3 Max
      'qwen/qwen3-coder',                              // Qwen3 Coder 480B
      'qwen/qwen3-235b-a22b',                          // Qwen3 235B
      'qwen/qwen3-32b',                                // Qwen3 32B
      'qwen/qwen-plus',                                // Qwen Plus
      'moonshotai/kimi-k2',                            // Kimi K2
      'moonshotai/kimi-k2.5',                          // Kimi K2.5
      'z-ai/glm-5',                                    // GLM-5
      'z-ai/glm-4.5',                                  // GLM-4.5
      'minimax/minimax-m2.7',                          // MiniMax M2.7
      'minimax/minimax-m2.5',                          // MiniMax M2.5

      // ── 热门国际付费模型 ────────────────────────────────────────────────
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-sonnet-4',                     // Claude Sonnet 4
      'anthropic/claude-opus-4.5',                     // Claude Opus 4.5
      'google/gemini-2.5-flash',                       // Gemini 2.5 Flash
      'google/gemini-2.5-pro-preview',                 // Gemini 2.5 Pro

      // ── 编程专用 ───────────────────────────────────────────────────────
      'qwen/qwen3-coder-30b-a3b-instruct',             // Qwen3 Coder 30B
      'mistralai/devstral-small',                      // Devstral Small
    ],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    defaultHeaders: {
      'HTTP-Referer': 'https://marklite.app',
      'X-Title': 'MarkLite++',
    },
    description: '200+ 模型统一入口，免费模型 ID 末尾带 :free（如 meta-llama/llama-3.3-70b-instruct:free）',
    modelLabels: {
      // 免费模型
      'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B (免费)',
      'qwen/qwen3-next-80b-a3b-instruct:free':  'Qwen3 Next 80B (免费)',
      'qwen/qwen3-coder:free':                  'Qwen3 Coder 480B (免费)',
      'z-ai/glm-4.5-air:free':                  'GLM-4.5 Air (免费)',
      'minimax/minimax-m2.5:free':              'MiniMax M2.5 (免费)',
      'google/gemma-3-27b-it:free':             'Gemma 3 27B (免费)',
      'openai/gpt-oss-120b:free':               'GPT-OSS 120B (免费)',
      // 国产付费
      'deepseek/deepseek-v3.2':                'DeepSeek V3.2',
      'deepseek/deepseek-r1':                  'DeepSeek R1',
      'deepseek/deepseek-r1-0528':             'DeepSeek R1 (0528)',
      'deepseek/deepseek-chat':                'DeepSeek V3',
      'qwen/qwen3-max':                        'Qwen3 Max',
      'qwen/qwen3-coder':                      'Qwen3 Coder 480B',
      'qwen/qwen3-235b-a22b':                  'Qwen3 235B',
      'qwen/qwen3-32b':                        'Qwen3 32B',
      'qwen/qwen-plus':                        'Qwen Plus',
      'moonshotai/kimi-k2':                    'Kimi K2',
      'moonshotai/kimi-k2.5':                  'Kimi K2.5',
      'z-ai/glm-5':                            'GLM-5',
      'z-ai/glm-4.5':                          'GLM-4.5',
      'minimax/minimax-m2.7':                  'MiniMax M2.7',
      'minimax/minimax-m2.5':                  'MiniMax M2.5',
      // 国际付费
      'openai/gpt-4o':                         'GPT-4o',
      'openai/gpt-4o-mini':                    'GPT-4o Mini',
      'anthropic/claude-sonnet-4':             'Claude Sonnet 4',
      'anthropic/claude-opus-4.5':             'Claude Opus 4.5',
      'google/gemini-2.5-flash':               'Gemini 2.5 Flash',
      'google/gemini-2.5-pro-preview':         'Gemini 2.5 Pro',
      // 编程
      'qwen/qwen3-coder-30b-a3b-instruct':     'Qwen3 Coder 30B',
      'mistralai/devstral-small':              'Devstral Small',
      // 旧版保留（用户已配置的模型给出友好名称）
      'anthropic/claude-3.5-sonnet-20240620':  'Claude Sonnet 3.5',
      'anthropic/claude-3.5-haiku-20241022':   'Claude Haiku 3.5',
      'anthropic/claude-3-opus-20240229':      'Claude Opus 3',
      'openai/o3-mini':                        'o3 Mini',
      'openai/o4-mini':                        'o4 Mini',
      'deepseek/deepseek-chat-v3-0324':        'DeepSeek V3 (0324)',
      'deepseek/deepseek-chat:free':           '⚠ DeepSeek V3 免费 (已下线)',
      'deepseek/deepseek-r1:free':             '⚠ DeepSeek R1 免费 (已下线)',
      'deepseek/deepseek-chat-v3-0324:free':   '⚠ DeepSeek V3-0324 免费 (已下线)',
    },
  },
  {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    type: 'cloud',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-auto', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'moonshot-v1-auto',
    apiKeyPlaceholder: 'sk-...',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    description: 'Moonshot Kimi models',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    type: 'cloud',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      'deepseek-chat',  // DeepSeek Chat
      'deepseek-reasoner',  // DeepSeek推理版
      'deepseek-coder',  // 编码专用
      'deepseek-v3',  // DeepSeek V3
    ],
    defaultModel: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    description: 'DeepSeek AI models (including reasoning and coding variants)',
  },
  {
    id: 'zhipu',
    label: 'ChatGLM (Zhipu)',
    type: 'cloud',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash', 'glm-4'],
    defaultModel: 'glm-4-flash',
    apiKeyPlaceholder: 'xxx.yyy',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    description: 'Zhipu AI ChatGLM models',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI Compatible)',
    type: 'cloud',
    baseUrl: '',
    models: [],
    defaultModel: '',
    apiKeyPlaceholder: 'your-api-key',
    description: 'Any OpenAI-compatible API endpoint',
  },
];

export function getPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.id === id);
}

/**
 * Returns a short human-readable label for a model ID.
 * Falls back to the raw model ID if no label is registered.
 */
export function getModelLabel(providerId: string, modelId: string): string {
  return getPreset(providerId)?.modelLabels?.[modelId] ?? modelId;
}
