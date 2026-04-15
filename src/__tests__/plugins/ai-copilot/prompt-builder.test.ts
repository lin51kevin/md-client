import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock i18n to return predictable strings
vi.mock('../../../i18n', () => ({
  getT: () => (key: string, params?: Record<string, string | number>) => {
    // Return a stable string containing the key and any interpolated params
    let s = `[${key}]`;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        s += ` ${k}=${v}`;
      });
    }
    return s;
  },
  useI18n: () => ({
    t: (key: string) => `[${key}]`,
    locale: 'en',
    setLocale: vi.fn(),
  }),
}));

// Mock the context assembler
vi.mock('../../../plugins/official/ai-copilot/src/context-assembler', () => ({
  assembleScopedContext: (_ctx: any, scope: string, _max: number) => ({
    targetText: `[scoped-text:${scope}]`,
    outline: '[outline]',
    strategy: scope === 'selection' ? 'selection' : scope === 'workspace' ? 'workspace' : 'full',
  }),
}));

const { buildSystemPrompt, buildChatPrompt, extractModifiedText } = await import(
  '../../../plugins/official/ai-copilot/src/prompt-builder'
);

describe('extractModifiedText', () => {
  it('extracts content from ```markdown code block', () => {
    const response = 'Here is the result:\n```markdown\n# Hello World\n\nSome content.\n```\nDone!';
    expect(extractModifiedText(response)).toBe('# Hello World\n\nSome content.');
  });

  it('extracts content from ```md code block', () => {
    const response = '```md\nContent here\n```';
    expect(extractModifiedText(response)).toBe('Content here');
  });

  it('extracts content from ``` (no language) code block', () => {
    const response = '```\nPlain block\n```';
    expect(extractModifiedText(response)).toBe('Plain block');
  });

  it('returns null when no code block present', () => {
    expect(extractModifiedText('Just some plain text')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractModifiedText('')).toBeNull();
  });

  it('extracts only the first matching code block', () => {
    const response = '```markdown\nFirst\n```\n\n```markdown\nSecond\n```';
    expect(extractModifiedText(response)).toBe('First');
  });

  it('trims whitespace from extracted content', () => {
    const response = '```markdown\n  \n  Padded\n  \n```';
    expect(extractModifiedText(response)).toBe('Padded');
  });
});

describe('buildSystemPrompt', () => {
  const baseContext = {
    content: '# Test\n\nSome content',
    cursor: { line: 1, column: 0, offset: 0 },
    filePath: '/test/file.md',
  };

  it('includes system intro and file path', () => {
    const result = buildSystemPrompt(baseContext as any);
    expect(result).toContain('[aiCopilot.prompt.systemIntro]');
    expect(result).toContain('filePath=/test/file.md');
  });

  it('includes cursor position', () => {
    const result = buildSystemPrompt(baseContext as any);
    expect(result).toContain('line=1');
    expect(result).toContain('column=0');
  });

  it('includes selected text when selection is present', () => {
    const ctx = { ...baseContext, selection: { from: 0, to: 5, text: 'Hello' } };
    const result = buildSystemPrompt(ctx as any);
    expect(result).toContain('[aiCopilot.prompt.selectedText]');
    expect(result).toContain('Hello');
  });

  it('does not include selected text section when no selection', () => {
    const result = buildSystemPrompt(baseContext as any);
    expect(result).not.toContain('[aiCopilot.prompt.selectedText]');
  });

  it('includes response and code block instructions', () => {
    const result = buildSystemPrompt(baseContext as any);
    expect(result).toContain('[aiCopilot.prompt.responseInstruction]');
    expect(result).toContain('[aiCopilot.prompt.codeBlockInstruction]');
  });

  it('uses unsaved file label when filePath is null', () => {
    const ctx = { ...baseContext, filePath: null };
    const result = buildSystemPrompt(ctx as any);
    expect(result).toContain('[aiCopilot.prompt.unsavedFile]');
  });
});

describe('buildChatPrompt', () => {
  const baseContext = {
    content: '# Test\n\nBody text',
    cursor: { line: 1, column: 0, offset: 0 },
    filePath: '/test/file.md',
  };

  it('generates explain prompt', () => {
    const intent = { action: 'explain', target: 'document', params: {}, originalText: '/explain' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toContain('[aiCopilot.prompt.explain]');
  });

  it('generates summarize prompt', () => {
    const intent = { action: 'summarize', target: 'document', params: {}, originalText: '/summarize' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toContain('[aiCopilot.prompt.summarize]');
  });

  it('generates translate prompt with language', () => {
    const intent = { action: 'translate', target: 'document', params: { language: 'French' }, originalText: '/translate French' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toContain('[aiCopilot.prompt.translate]');
    expect(result).toContain('language=French');
  });

  it('translate defaults to english when no language param', () => {
    const intent = { action: 'translate', target: 'document', params: {}, originalText: '/translate' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toContain('language=english');
  });

  it('generates format prompt', () => {
    const intent = { action: 'format', target: 'document', params: {}, originalText: '/format' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toContain('[aiCopilot.prompt.format]');
  });

  it('generates edit prompt with instruction', () => {
    const intent = { action: 'edit', target: 'document', params: { instruction: 'make it shorter' }, originalText: 'make it shorter' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toContain('[aiCopilot.prompt.editInstruction]');
    expect(result).toContain('instruction=make it shorter');
  });

  it('edit prompt uses originalText when no instruction param', () => {
    const intent = { action: 'edit', target: 'document', params: {}, originalText: 'rewrite this' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toContain('instruction=rewrite this');
  });

  it('question action returns originalText directly', () => {
    const intent = { action: 'question', target: 'document', params: {}, originalText: 'What is Markdown?' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toBe('What is Markdown?');
  });

  it('unknown action defaults to originalText', () => {
    const intent = { action: 'unknown-action', target: 'document', params: {}, originalText: 'hello world' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    expect(result).toBe('hello world');
  });

  it('uses intent target as scope when context.scope is missing', () => {
    const intent = { action: 'explain', target: 'selection', params: {}, originalText: '/explain' };
    const result = buildChatPrompt(intent as any, baseContext as any);
    // The scoped context receives 'selection' as scope
    expect(result).toContain('content=[scoped-text:selection]');
  });

  it('context.scope takes precedence over intent.target', () => {
    const intent = { action: 'explain', target: 'selection', params: {}, originalText: '/explain' };
    const ctx = { ...baseContext, scope: 'workspace' };
    const result = buildChatPrompt(intent as any, ctx as any);
    expect(result).toContain('content=[scoped-text:workspace]');
  });
});
