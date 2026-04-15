import { describe, expect, it } from 'vitest';
import { assembleScopedContext } from '../../../plugins/official/ai-copilot/src/context-assembler';
import type { EditorContext } from '../../../plugins/official/ai-copilot/src/providers/types';

const baseCtx: EditorContext = {
  filePath: '/notes.md',
  content: '',
  cursor: { line: 1, column: 1, offset: 0 },
};

describe('assembleScopedContext', () => {
  it('returns full content for short docs', () => {
    const ctx: EditorContext = { ...baseCtx, content: '# T\n\nshort content', cursor: { line: 2, column: 2, offset: 5 } };
    const result = assembleScopedContext(ctx, 'document', 200);
    expect(result.targetText).toContain('short content');
    expect(result.outline).toContain('# T');
  });

  it('returns smart window for long docs', () => {
    const long = Array.from({ length: 300 }, (_, i) => `Line ${i + 1}`).join('\n');
    const ctx: EditorContext = { ...baseCtx, content: long, cursor: { line: 150, column: 1, offset: long.indexOf('Line 150') } };
    const result = assembleScopedContext(ctx, 'document', 300);
    expect(result.targetText.length).toBeLessThanOrEqual(320);
    expect(result.targetText).toContain('Line 150');
    expect(result.strategy).toBe('smart-window');
  });

  it('prefers selection when scope is selection', () => {
    const ctx: EditorContext = {
      ...baseCtx,
      content: '# A\n\nHello\nWorld',
      selection: { from: 5, to: 10, text: 'Hello' },
      cursor: { line: 3, column: 1, offset: 6 },
    };
    const result = assembleScopedContext(ctx, 'selection', 100);
    expect(result.targetText).toBe('Hello');
  });
});
