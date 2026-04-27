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

describe('intent parser delete patterns', () => {
  it('parses "删除" → delete', () => {
    const r = parseIntent('删除这段话');
    expect(r.action).toBe('delete');
    expect(r.target).toBe('selection');
  });

  it('parses "删掉" → delete', () => {
    const r = parseIntent('删掉这几行');
    expect(r.action).toBe('delete');
  });

  it('parses "去掉" → delete', () => {
    const r = parseIntent('去掉多余的内容');
    expect(r.action).toBe('delete');
  });

  it('parses "移除" → delete', () => {
    const r = parseIntent('移除这个标题');
    expect(r.action).toBe('delete');
  });

  it('parses English "delete" → delete', () => {
    const r = parseIntent('delete this paragraph');
    expect(r.action).toBe('delete');
  });

  it('parses English "remove" → delete', () => {
    const r = parseIntent('remove the last section');
    expect(r.action).toBe('delete');
  });

  it('/delete quick command → delete action targeting selection', () => {
    const r = parseIntent('/delete');
    expect(r.action).toBe('delete');
    expect(r.target).toBe('selection');
    expect(r.confidence).toBe(1.0);
  });
});

describe('intent parser continuation insert patterns', () => {
  it('parses "继续写" → insert with mode:continue', () => {
    const r = parseIntent('继续写');
    expect(r.action).toBe('insert');
    expect(r.target).toBe('cursor');
    expect(r.params.mode).toBe('continue');
  });

  it('parses "接着写" → insert with mode:continue', () => {
    const r = parseIntent('接着写');
    expect(r.action).toBe('insert');
    expect(r.params.mode).toBe('continue');
  });

  it('parses English "continue" → insert with mode:continue', () => {
    const r = parseIntent('continue');
    expect(r.action).toBe('insert');
    expect(r.params.mode).toBe('continue');
  });

  it('parses English "keep writing" → insert with mode:continue', () => {
    const r = parseIntent('keep writing');
    expect(r.action).toBe('insert');
    expect(r.params.mode).toBe('continue');
  });
});

describe('intent parser markdown inline format patterns', () => {
  it('parses "加粗" → edit with mode:bold', () => {
    const r = parseIntent('把这段文字加粗');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('bold');
  });

  it('parses "斜体" → edit with mode:italic', () => {
    const r = parseIntent('变成斜体');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('italic');
  });

  it('parses "改成标题" → edit with mode:heading', () => {
    const r = parseIntent('改成标题');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('heading');
  });

  it('parses "转为列表" → edit with mode:list', () => {
    const r = parseIntent('转为列表');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('list');
  });

  it('parses "加代码块" → edit with mode:code', () => {
    const r = parseIntent('加代码块');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('code');
  });

  it('parses English "bold" → edit with mode:bold', () => {
    const r = parseIntent('make it bold');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('bold');
  });

  it('parses English "italic" → edit with mode:italic', () => {
    const r = parseIntent('make it italic');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('italic');
  });

  it('parses English "code block" → edit with mode:code', () => {
    const r = parseIntent('wrap in code block');
    expect(r.action).toBe('edit');
    expect(r.params.mode).toBe('code');
  });
});

describe('intent parser section hint override', () => {
  it('overrides target to section when "这节" is present', () => {
    const r = parseIntent('这节删掉');
    expect(r.action).toBe('delete');
    expect(r.target).toBe('section');
  });

  it('overrides target to section when "这章" is present', () => {
    const r = parseIntent('把这章改写一下');
    expect(r.action).toBe('edit');
    expect(r.target).toBe('section');
  });

  it('overrides target to section for English "this section"', () => {
    const r = parseIntent('delete this section');
    expect(r.action).toBe('delete');
    expect(r.target).toBe('section');
  });

  it('does NOT override target for cursor-targeted insert', () => {
    const r = parseIntent('这里继续写');
    expect(r.action).toBe('insert');
    expect(r.target).toBe('cursor');
  });
});
