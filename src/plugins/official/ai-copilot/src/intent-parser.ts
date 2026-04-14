/** Intent parser for AI Copilot quick commands and natural language input. */

export interface ParsedIntent {
  action: 'edit' | 'explain' | 'summarize' | 'translate' | 'format' | 'question';
  target: 'selection' | 'document';
  params: Record<string, string>;
  confidence: number;
  originalText: string;
}

const QUICK_COMMANDS: Record<string, Partial<ParsedIntent>> = {
  '/explain': { action: 'explain', target: 'selection' },
  '/rewrite': { action: 'edit', target: 'selection', params: { mode: 'rewrite' } },
  '/summarize': { action: 'summarize', target: 'document' },
  '/translate': { action: 'translate', target: 'selection' },
  '/format': { action: 'format', target: 'selection' },
  '/todo': { action: 'edit', target: 'selection', params: { mode: 'todo' } },
  '/expand': { action: 'edit', target: 'selection', params: { mode: 'expand' } },
};

export function getQuickCommandList(): Array<{ command: string; label: string; description: string }> {
  return [
    { command: '/explain', label: 'Explain', description: 'Explain selected text' },
    { command: '/rewrite', label: 'Rewrite', description: 'Rewrite selected text' },
    { command: '/summarize', label: 'Summarize', description: 'Summarize the document' },
    { command: '/translate', label: 'Translate', description: 'Translate selected text' },
    { command: '/format', label: 'Format', description: 'Format markdown content' },
    { command: '/todo', label: 'TODO', description: 'Generate a TODO list' },
    { command: '/expand', label: 'Expand', description: 'Expand abbreviated content' },
  ];
}

export function parseIntent(input: string): ParsedIntent {
  const trimmed = input.trim();

  // 1. Quick commands
  for (const [cmd, template] of Object.entries(QUICK_COMMANDS)) {
    if (trimmed.startsWith(cmd)) {
      const instruction = trimmed.slice(cmd.length).trim();
      return {
        action: template.action ?? 'question',
        target: template.target ?? 'selection',
        params: { ...template.params, instruction },
        confidence: 1.0,
        originalText: trimmed,
      };
    }
  }

  // 2. Natural language patterns (Chinese)
  const patterns: Array<{
    regex: RegExp;
    action: ParsedIntent['action'];
    target: ParsedIntent['target'];
    extract: (m: RegExpMatchArray) => Record<string, string>;
  }> = [
    { regex: /(把|将)(.+)(改|变|换)成(.+)/, action: 'edit', target: 'selection', extract: (m) => ({ from: m[2], to: m[4] }) },
    { regex: /(改写|重写|润色)/, action: 'edit', target: 'selection', extract: () => ({ mode: 'rewrite' }) },
    { regex: /(解释|说明|讲讲|什么意思)/, action: 'explain', target: 'selection', extract: () => ({}) },
    { regex: /翻译成?(.*)/, action: 'translate', target: 'selection', extract: (m) => ({ language: m[1].trim() || 'english' }) },
    { regex: /(总结|概括|摘要)/, action: 'summarize', target: 'document', extract: () => ({}) },
    { regex: /(格式化|整理格式)/, action: 'format', target: 'selection', extract: () => ({}) },
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      return {
        action: pattern.action,
        target: pattern.target,
        params: { ...pattern.extract(match), instruction: trimmed },
        confidence: 0.85,
        originalText: trimmed,
      };
    }
  }

  // 3. Default to question
  return {
    action: 'question',
    target: 'document',
    params: { instruction: trimmed },
    confidence: 0.5,
    originalText: trimmed,
  };
}
