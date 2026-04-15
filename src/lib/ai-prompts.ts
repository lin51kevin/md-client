/**
 * AIAction — supported AI text processing actions for selection processing.
 */

export type AIAction = 'polish' | 'explain' | 'translate' | 'summarize' | 'rewrite';

export const AI_ACTION_LABELS: Record<AIAction, { zh: string; en: string }> = {
  polish:    { zh: '润色结果', en: 'Polished Result' },
  explain:   { zh: '解释结果', en: 'Explanation' },
  translate: { zh: '翻译结果', en: 'Translation' },
  summarize: { zh: '总结结果', en: 'Summary' },
  rewrite:   { zh: '改写结果', en: 'Rewritten Result' },
};

/**
 * Prompt templates for each AI action.
 * Each action has a system prompt and a user-message builder.
 */
export const AI_PROMPTS: Record<AIAction, { system: string; user: (text: string) => string }> = {
  polish: {
    system: '你是一个专业的文字润色助手。请润色以下文字，使其更加流畅、专业。直接返回润色结果，不要添加解释。',
    user: (text) => text,
  },
  explain: {
    system: '你是一个耐心的技术导师。请通俗易懂地解释以下内容。如果涉及代码，先解释整体思路，再逐段说明。直接返回解释结果，不要添加"以下是"等前缀。',
    user: (text) => text,
  },
  translate: {
    system: '你是一个专业的翻译助手。请将以下文字翻译成中文（如果原文是英文），或翻译成英文（如果原文是中文）。直接返回翻译结果，不要添加解释。',
    user: (text) => text,
  },
  summarize: {
    system: '你是一个专业的文字总结助手。请简洁地总结以下文字的核心要点。直接返回总结结果，使用 bullet points。',
    user: (text) => text,
  },
  rewrite: {
    system: '你是一个专业的文字改写助手。请在不改变原意的前提下，用不同的表达方式改写以下文字。直接返回改写结果，不要添加解释。',
    user: (text) => text,
  },
};
