import { describe, expect, it } from 'vitest';
import { parseIntent } from '../../../plugins/official/ai-copilot/src/intent-parser';

describe('intent parser markdown shortcuts', () => {
  it('parses /toc command', () => {
    const intent = parseIntent('/toc');
    expect(intent.action).toBe('edit');
    expect(intent.params.mode).toBe('toc');
    expect(intent.target).toBe('document');
  });

  it('parses /fix-links command', () => {
    const intent = parseIntent('/fix-links');
    expect(intent.action).toBe('edit');
    expect(intent.params.mode).toBe('fix-links');
  });

  it('parses /scope workspace prefix', () => {
    const intent = parseIntent('/scope workspace summarize all docs');
    expect(intent.target).toBe('workspace');
    expect(intent.params.instruction).toContain('summarize all docs');
  });

  it('parses /scope tab:path prefix', () => {
    const intent = parseIntent('/scope tab:README.md rewrite intro');
    expect(intent.target).toBe('tab');
    expect(intent.params.targetFilePath).toBe('README.md');
  });
});
