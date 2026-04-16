/** Intent parser for AI Copilot quick commands and natural language input. */
import type { EditScopeMode } from './providers/types';

export interface ParsedIntent {
  action: 'edit' | 'explain' | 'summarize' | 'translate' | 'format' | 'question' | 'create_document' | 'polish';
  target: EditScopeMode;
  params: Record<string, string>;
  confidence: number;
  originalText: string;
}

const QUICK_COMMANDS: Record<string, Partial<ParsedIntent>> = {
  '/new': { action: 'create_document', target: 'document' },
  '/polish': { action: 'polish', target: 'selection' },
  '/explain': { action: 'explain', target: 'selection' },
  '/rewrite': { action: 'edit', target: 'selection', params: { mode: 'rewrite' } },
  '/summarize': { action: 'summarize', target: 'document' },
  '/translate': { action: 'translate', target: 'selection' },
  '/format': { action: 'format', target: 'selection' },
  '/todo': { action: 'edit', target: 'selection', params: { mode: 'todo' } },
  '/expand': { action: 'edit', target: 'selection', params: { mode: 'expand' } },
  '/toc': { action: 'edit', target: 'document', params: { mode: 'toc' } },
  '/lint': { action: 'edit', target: 'document', params: { mode: 'lint' } },
  '/fix-links': { action: 'edit', target: 'document', params: { mode: 'fix-links' } },
  '/table-format': { action: 'edit', target: 'selection', params: { mode: 'table-format' } },
  '/heading-promote': { action: 'edit', target: 'selection', params: { mode: 'heading-promote' } },
};

export function getQuickCommandList(): Array<{ command: string; label: string; description: string }> {
  return [
    { command: '/new', label: 'New Doc', description: 'Create a new document with AI content' },
    { command: '/polish', label: 'Polish', description: 'Polish and improve selected text' },
    { command: '/explain', label: 'Explain', description: 'Explain selected text' },
    { command: '/rewrite', label: 'Rewrite', description: 'Rewrite selected text' },
    { command: '/summarize', label: 'Summarize', description: 'Summarize the document' },
    { command: '/translate', label: 'Translate', description: 'Translate selected text' },
    { command: '/format', label: 'Format', description: 'Format markdown content' },
    { command: '/todo', label: 'TODO', description: 'Generate a TODO list' },
    { command: '/expand', label: 'Expand', description: 'Expand abbreviated content' },
    { command: '/toc', label: 'TOC', description: 'Generate table of contents' },
    { command: '/lint', label: 'Lint', description: 'Lint markdown style issues' },
    { command: '/fix-links', label: 'Fix Links', description: 'Fix broken markdown links' },
    { command: '/table-format', label: 'Table Format', description: 'Format markdown tables' },
    { command: '/heading-promote', label: 'Promote Heading', description: 'Adjust heading levels' },
  ];
}

function parseScopeMode(input: string): { target: EditScopeMode; targetFilePath?: string } {
  const token = input.trim().toLowerCase();
  if (token === 'selection') return { target: 'selection' };
  if (token === 'cursor' || token === 'cur') return { target: 'cursor' };
  if (token === 'document' || token === 'doc') return { target: 'document' };
  if (token === 'workspace' || token === 'ws') return { target: 'workspace' };
  if (token.startsWith('tab:')) {
    return { target: 'tab', targetFilePath: input.slice(4).trim() };
  }
  if (token === 'tab') return { target: 'tab' };
  return { target: 'document' };
}

export function parseIntent(input: string): ParsedIntent {
  const trimmed = input.trim();

  if (trimmed.startsWith('/scope ')) {
    const rest = trimmed.slice('/scope '.length).trim();
    const firstSpace = rest.indexOf(' ');
    const scopeToken = firstSpace >= 0 ? rest.slice(0, firstSpace) : rest;
    const nestedInstruction = firstSpace >= 0 ? rest.slice(firstSpace + 1).trim() : '';
    const scoped = parseScopeMode(scopeToken);
    const nested = nestedInstruction
      ? parseIntent(nestedInstruction)
      : {
          action: 'question' as const,
          target: 'document' as const,
          params: { instruction: '' },
          confidence: 0.8,
          originalText: trimmed,
        };
    return {
      ...nested,
      target: scoped.target,
      params: {
        ...nested.params,
        instruction: nestedInstruction || nested.params.instruction || '',
        ...(scoped.targetFilePath ? { targetFilePath: scoped.targetFilePath } : {}),
      },
      originalText: trimmed,
      confidence: Math.max(0.8, nested.confidence),
    };
  }

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

  // 0. Create new document — check before generic patterns
  const createNewDocPatterns = [
    /^(请|帮我?|请帮我?)?(创建|新建|生成)(一[个份]?)?(新[的]?)?(文档|文件|md|markdown)/i,
    /^create (a )?(new )?(document|file|markdown|doc)/i,
    /^(新建|创建)(文档|文件)/i,
  ];
  if (createNewDocPatterns.some((re) => re.test(trimmed))) {
    return {
      action: 'create_document',
      target: 'document',
      params: { instruction: trimmed },
      confidence: 0.95,
      originalText: trimmed,
    };
  }

  const patterns: Array<{
    regex: RegExp;
    action: ParsedIntent['action'];
    target: ParsedIntent['target'];
    extract: (m: RegExpMatchArray) => Record<string, string>;
  }> = [
    { regex: /(把|将)(.+)(改|变|换)成(.+)/, action: 'edit', target: 'selection', extract: (m) => ({ from: m[2], to: m[4] }) },
    { regex: /(改写|重写)/, action: 'edit', target: 'selection', extract: () => ({ mode: 'rewrite' }) },
    { regex: /润色/, action: 'polish', target: 'selection', extract: () => ({}) },
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

  // 3. Default to question – target 'selection' so that getEffectiveScope
  //    falls back to 'cursor' when nothing is selected.
  return {
    action: 'question',
    target: 'selection',
    params: { instruction: trimmed },
    confidence: 0.5,
    originalText: trimmed,
  };
}
