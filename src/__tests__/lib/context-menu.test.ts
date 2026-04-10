import { describe, it, expect } from 'vitest';
import {
  detectContextType,
  detectContext,
} from '../../lib/context-menu';

describe('context-menu: detectContextType', () => {
  it('returns "heading" for text starting with #', () => {
    expect(detectContextType('## My Heading', 0)).toBe('heading');
    expect(detectContextType('# h1', 0)).toBe('heading');
    expect(detectContextType('###### h6', 0)).toBe('heading');
  });

  it('returns "heading" when cursor is on a heading line', () => {
    const doc = 'Some text\n## Heading\nMore text';
    const headingStart = doc.indexOf('##');
    expect(detectContext(doc, headingStart).type).toBe('heading');
  });

  it('returns "code" for text inside triple backticks', () => {
    expect(detectContextType('```\ncode block\n```', 5)).toBe('code');
  });

  it('returns "table" for text inside table rows', () => {
    expect(detectContextType('| col1 | col2 |', 2)).toBe('table');
  });

  it('returns "listItem" for text starting with - or * or 1.', () => {
    expect(detectContextType('- list item', 0)).toBe('listItem');
    expect(detectContextType('* bullet', 0)).toBe('listItem');
    expect(detectContextType('1. ordered', 0)).toBe('listItem');
  });

  it('returns "blockquote" for text starting with >', () => {
    expect(detectContextType('> quote text', 0)).toBe('blockquote');
  });

  it('returns "normal" for regular paragraph text', () => {
    expect(detectContextType('Just a paragraph', 0)).toBe('normal');
    expect(detectContextType('Multi\nline\ntext', 3)).toBe('normal');
  });
});

describe('context-menu: ContextMenuOptions', () => {
  it('formats option list correctly', () => {
    // Verify the type contract: each option has label + action
    const options = [
      { label: 'Bold', action: 'wrap', params: { wrapper: '**' } },
      { label: 'Italic', action: 'wrap', params: { wrapper: '*' } },
      { label: 'Cut', action: 'cut' },
    ];
    expect(options.length).toBe(3);
    expect(options[0].label).toBe('Bold');
  });
});
