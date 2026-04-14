import { describe, it, expect } from 'vitest';
import {
  autoFormatMarkdown,
  ensureTrailingNewline,
  normalizeBlankLines,
  formatBlockquote,
  formatListItem,
  formatCodeBlock,
} from '../../lib/auto-format';

describe('ensureTrailingNewline', () => {
  it('adds newline if missing', () => {
    expect(ensureTrailingNewline('hello')).toBe('hello\n');
  });

  it('keeps existing newline', () => {
    expect(ensureTrailingNewline('hello\n')).toBe('hello\n');
  });

  it('handles empty string', () => {
    expect(ensureTrailingNewline('')).toBe('\n');
  });

  it('keeps only one trailing newline', () => {
    expect(ensureTrailingNewline('hello\n\n')).toBe('hello\n\n');
  });
});

describe('normalizeBlankLines', () => {
  it('collapses multiple blank lines into one', () => {
    expect(normalizeBlankLines('a\n\n\nb')).toBe('a\n\nb');
  });

  it('handles no blank lines', () => {
    expect(normalizeBlankLines('a\nb')).toBe('a\nb');
  });

  it('handles empty string', () => {
    expect(normalizeBlankLines('')).toBe('');
  });

  it('handles only blank lines', () => {
    expect(normalizeBlankLines('\n\n\n')).toBe('\n\n');
  });

  it('handles special characters', () => {
    expect(normalizeBlankLines('hello\n\n\n世界\n\n\n')).toBe('hello\n\n世界\n\n');
  });
});

describe('formatBlockquote', () => {
  it('adds > prefix to each line', () => {
    expect(formatBlockquote('hello\nworld')).toBe('> hello\n> world\n');
  });

  it('handles single line', () => {
    expect(formatBlockquote('hello')).toBe('> hello\n');
  });

  it('supports depth', () => {
    expect(formatBlockquote('hello', 2)).toBe('> > hello\n');
  });

  it('handles empty string', () => {
    expect(formatBlockquote('')).toBe('> \n');
  });

  it('handles lines with spaces', () => {
    expect(formatBlockquote('  indented')).toBe('>   indented\n');
  });
});

describe('formatListItem', () => {
  it('formats unordered list item', () => {
    expect(formatListItem('item', false, 0)).toBe('- item');
  });

  it('formats ordered list item', () => {
    expect(formatListItem('item', true, 1)).toBe('1. item');
  });

  it('handles nested unordered', () => {
    expect(formatListItem('item', false, 0, 1)).toBe('  - item');
  });

  it('handles nested ordered', () => {
    expect(formatListItem('item', true, 2, 2)).toBe('    2. item');
  });

  it('handles empty text', () => {
    expect(formatListItem('', false, 0)).toBe('- ');
  });

  it('handles special characters', () => {
    expect(formatListItem('中文 *bold*', false, 0)).toBe('- 中文 *bold*');
  });
});

describe('formatCodeBlock', () => {
  it('wraps without language', () => {
    expect(formatCodeBlock('code here')).toBe('```\ncode here\n```\n');
  });

  it('wraps with language', () => {
    expect(formatCodeBlock('code here', 'ts')).toBe('```ts\ncode here\n```\n');
  });

  it('handles empty string', () => {
    expect(formatCodeBlock('')).toBe('```\n\n```\n');
  });

  it('preserves indentation', () => {
    expect(formatCodeBlock('  indented')).toBe('```\n  indented\n```\n');
  });
});

describe('autoFormatMarkdown', () => {
  it('formats paragraph', () => {
    expect(autoFormatMarkdown('hello\n\nworld', 'paragraph')).toBe('hello\n\nworld\n');
  });

  it('formats heading h1', () => {
    expect(autoFormatMarkdown('Title', 'heading', 1)).toBe('# Title\n');
  });

  it('formats heading h2', () => {
    expect(autoFormatMarkdown('Title', 'heading', 2)).toBe('## Title\n');
  });

  it('formats heading h3', () => {
    expect(autoFormatMarkdown('Title', 'heading', 3)).toBe('### Title\n');
  });

  it('formats blockquote', () => {
    expect(autoFormatMarkdown('some quote', 'blockquote')).toBe('> some quote\n');
  });

  it('formats codeBlock', () => {
    expect(autoFormatMarkdown('let x = 1;', 'codeBlock')).toBe('```\nlet x = 1;\n```\n');
  });

  it('normalizes blank lines for paragraph', () => {
    expect(autoFormatMarkdown('a\n\n\n\nb', 'paragraph')).toBe('a\n\nb\n');
  });

  it('handles empty string for paragraph', () => {
    expect(autoFormatMarkdown('', 'paragraph')).toBe('\n');
  });

  it('handles pure whitespace', () => {
    expect(autoFormatMarkdown('   ', 'paragraph')).toBe('   \n');
  });
});
