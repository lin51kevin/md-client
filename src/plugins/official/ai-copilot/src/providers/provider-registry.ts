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
      // 免费模型（模型 ID 末尾加 :free，无需余额）
      'meta-llama/llama-3.3-70b-instruct:free',   // Llama 3.3 70B 免费版
      'deepseek/deepseek-r1:free',                 // DeepSeek R1 免费版
      'deepseek/deepseek-chat-v3-0324:free',       // DeepSeek V3 免费版
      'google/gemma-3-27b-it:free',                // Gemma 3 27B 免费版
      'qwen/qwen3-8b:free',                        // Qwen3 8B 免费版
      'mistralai/mistral-7b-instruct:free',        // Mistral 7B 免费版

      // 热门付费模型
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/o3-mini',
      'anthropic/claude-3.5-sonnet-20240620',
      'anthropic/claude-3.5-haiku-20241022',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-r1',
      'meta-llama/llama-4-maverick-32b',
      'mistralai/mistral-large',

      // 编码专用（付费）
      'qwen/qwen3-coder-480b',
      'mistralai/devstral-2-123b',
    ],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    defaultHeaders: {
      'HTTP-Referer': 'https://marklite.app',
      'X-Title': 'MarkLite',
    },
    description: '200+ 模型统一入口，免费模型 ID 末尾带 :free（如 meta-llama/llama-3.3-70b-instruct:free）',
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
