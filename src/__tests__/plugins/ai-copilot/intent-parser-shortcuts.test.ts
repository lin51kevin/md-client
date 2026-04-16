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

describe('intent parser replace/换 patterns', () => {
  it('parses "把X改成Y" → edit with from/to', () => {
    const r = parseIntent('把hello改成world');
    expect(r.action).toBe('edit');
    expect(r.params.from).toBe('hello');
    expect(r.params.to).toBe('world');
  });

  it('parses "把X替换成Y" → edit with correct from (no greedy bleed)', () => {
    const r = parseIntent('把hello替换成world');
    expect(r.action).toBe('edit');
    expect(r.params.from).toBe('hello');
    expect(r.params.to).toBe('world');
  });

  it('parses "将X换为Y" → edit with from/to', () => {
    const r = parseIntent('将foo换为bar');
    expect(r.action).toBe('edit');
    expect(r.params.from).toBe('foo');
    expect(r.params.to).toBe('bar');
  });

  it('parses standalone "替换" → edit', () => {
    const r = parseIntent('替换文中所有的旧词');
    expect(r.action).toBe('edit');
  });

  it('parses standalone "换掉" → edit', () => {
    const r = parseIntent('换掉这段话');
    expect(r.action).toBe('edit');
  });

  it('parses "把X变成Y" → edit with from/to', () => {
    const r = parseIntent('把A变成B');
    expect(r.action).toBe('edit');
    expect(r.params.from).toBe('A');
    expect(r.params.to).toBe('B');
  });

  it('pure question still returns question action', () => {
    const r = parseIntent('什么是 Markdown？');
    expect(r.action).toBe('question');
  });
});
