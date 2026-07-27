import { describe, it, expect } from 'vitest';
import { canFormatLanguage, formatCode } from '../../../lib/editor/format-document';

describe('format-document — canFormatLanguage', () => {
  it('recognises Prettier-supported languages', () => {
    for (const id of ['javascript', 'typescript', 'json', 'css', 'scss', 'less', 'html', 'yaml', 'markdown', 'graphql', 'xml']) {
      expect(canFormatLanguage(id)).toBe(true);
    }
  });

  it('rejects unsupported languages', () => {
    for (const id of ['python', 'rust', 'go', 'java', 'cpp', 'sql', 'shell', 'toml', 'ini', 'plaintext']) {
      expect(canFormatLanguage(id)).toBe(false);
    }
  });
});

describe('format-document — formatCode', () => {
  it('returns unsupported for languages Prettier cannot handle', async () => {
    const outcome = await formatCode('x=1', 'python');
    expect(outcome).toEqual({ unsupported: true });
  });

  it('formats JSON with 2-space indentation', async () => {
    const outcome = await formatCode('{"a":1,"b":[1,2]}', 'json');
    expect('formatted' in outcome).toBe(true);
    if ('formatted' in outcome) {
      expect(outcome.formatted).toBe('{ "a": 1, "b": [1, 2] }\n');
    }
  });

  it('formats TypeScript and normalises spacing', async () => {
    const outcome = await formatCode('const   x=1', 'typescript');
    if ('formatted' in outcome) {
      expect(outcome.formatted).toBe('const x = 1;\n');
    } else {
      throw new Error('expected formatted output');
    }
  });

  it('formats CSS declarations', async () => {
    const outcome = await formatCode('a{color:red}', 'css');
    if ('formatted' in outcome) {
      expect(outcome.formatted).toContain('color: red;');
    } else {
      throw new Error('expected formatted output');
    }
  });

  it('formats XML via the community plugin', async () => {
    const outcome = await formatCode('<root><a>1</a></root>', 'xml');
    if ('formatted' in outcome) {
      expect(outcome.formatted).toContain('<root>');
      expect(outcome.formatted).toContain('</root>');
    } else {
      throw new Error('expected formatted output');
    }
  });

  it('preserves a mapped cursor offset', async () => {
    const outcome = await formatCode('{"a":1}', 'json', { cursorOffset: 2 });
    if ('formatted' in outcome) {
      expect(outcome.cursorOffset).toBeGreaterThanOrEqual(0);
      expect(outcome.cursorOffset).toBeLessThanOrEqual(outcome.formatted.length);
    } else {
      throw new Error('expected formatted output');
    }
  });

  it('throws on invalid source so callers can surface an error', async () => {
    await expect(formatCode('{invalid json', 'json')).rejects.toBeDefined();
  });
});
