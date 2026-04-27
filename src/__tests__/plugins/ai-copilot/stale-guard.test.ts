import { describe, expect, it } from 'vitest';
import { validateActionAgainstCurrentContent } from '../../../plugins/official/ai-copilot/src/stale-guard';
import type { EditAction } from '../../../plugins/official/ai-copilot/src/providers/types';

function makeAction(overrides: Partial<EditAction>): EditAction {
  return {
    id: 'a1',
    type: 'replace',
    description: 'replace chunk',
    from: 0,
    to: 5,
    originalText: 'Hello',
    newText: 'Hi',
    sourceFilePath: '/doc.md',
    ...overrides,
  };
}

describe('validateActionAgainstCurrentContent', () => {
  it('returns valid for matching replace range', () => {
    const result = validateActionAgainstCurrentContent(makeAction({ from: 0, to: 5, originalText: 'Hello' }), 'Hello world');
    expect(result.valid).toBe(true);
  });

  it('returns invalid for stale replace range', () => {
    const result = validateActionAgainstCurrentContent(makeAction({ from: 0, to: 5, originalText: 'Hello' }), 'Hxllo world');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('stale');
  });

  it('validates insert bounds', () => {
    const ok = validateActionAgainstCurrentContent(makeAction({ type: 'insert', from: 3, to: 3, originalText: '' }), 'abcd');
    const bad = validateActionAgainstCurrentContent(makeAction({ type: 'insert', from: 10, to: 10, originalText: '' }), 'abcd');
    expect(ok.valid).toBe(true);
    expect(bad.valid).toBe(false);
  });

  it('accepts insert at end of document', () => {
    const result = validateActionAgainstCurrentContent(
      makeAction({ type: 'insert', from: 4, to: 4, originalText: '' }),
      'abcd',
    );
    expect(result.valid).toBe(true);
  });

  it('detects when replace source text moved nearby', () => {
    const result = validateActionAgainstCurrentContent(
      makeAction({ from: 0, to: 5, originalText: 'Hello' }),
      'xHello world',
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('moved');
  });
});
