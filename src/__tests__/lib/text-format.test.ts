import { describe, it, expect } from 'vitest';
import {
  wrapSelection,
  toggleLinePrefix,
  insertLink,
  insertImage,
  type SelectionInfo,
} from '../../lib/text-format';

function makeSelection(text: string, start: number, end: number): SelectionInfo {
  return { text, start, end };
}

describe('text-format: wrapSelection', () => {
  it('wraps selected text with prefix and suffix', () => {
    const sel = makeSelection('hello world', 0, 11);
    const result = wrapSelection(sel, '**');
    expect(result.replacement).toBe('**hello world**');
    expect(result.newCursorOffset).toBe(2); // cursor after opening **
  });

  it('wrapping non-empty selection positions cursor after opening wrapper', () => {
    const sel = makeSelection('bold text', 0, 10);
    const result = wrapSelection(sel, '~~');
    expect(result.replacement).toBe('~~bold text~~');
    expect(result.newCursorOffset).toBe(2); // after opening ~~
  });

  it('wrapping empty selection inserts placeholder and positions cursor between', () => {
    const sel = makeSelection('', 5, 5);
    const result = wrapSelection(sel, '**');
    expect(result.replacement).toBe('****');
    expect(result.newCursorOffset).toBe(2); // inside the pair
  });

  it('toggle: already wrapped text unwraps', () => {
    // Document: '__hello world__' (15 chars), select indices 0-15 (entire string)
    const sel = makeSelection('__hello world__', 0, 15);
    const result = wrapSelection(sel, '__');
    expect(result.replacement).toBe('hello world');
    expect(result.newCursorOffset).toBe(0);
  });

  it('wrapping inline code with backticks', () => {
    const sel = makeSelection('code', 0, 4);
    const result = wrapSelection(sel, '`');
    expect(result.replacement).toBe('`code`');
    expect(result.newCursorOffset).toBe(1);
  });
});

describe('text-format: toggleLinePrefix', () => {
  it('adds prefix to line without heading', () => {
    const text = 'Some text';
    const result = toggleLinePrefix(text, 0, '#');
    expect(result.replacement).toBe('# Some text');
  });

  it('removes existing heading prefix', () => {
    const text = '###### Existing heading';
    const result = toggleLinePrefix(text, 0, '#');
    // h6 -> removes (max level, cycles back to no heading)
    expect(result.replacement).toBe('Existing heading');
  });

  it('cycles heading level from h1 upward on repeated calls', () => {
    const text = 'Heading text';
    // none -> h1
    let r = toggleLinePrefix(text, 0, '#');
    expect(r.replacement).toBe('# Heading text');
    // h1 -> h2
    r = toggleLinePrefix(r.replacement, 0, '#');
    expect(r.replacement).toBe('## Heading text');
    // h2 -> h3
    r = toggleLinePrefix(r.replacement, 0, '#');
    expect(r.replacement).toBe('### Heading text');
  });
});

describe('text-format: insertLink', () => {
  it('inserts link syntax replacing selected text as link label', () => {
    const sel = makeSelection('click here', 0, 10);
    const result = insertLink(sel, 'https://example.com');
    expect(result.replacement).toBe('[click here](https://example.com)');
  });

  it('inserts link with empty selection as placeholder', () => {
    const sel = makeSelection('', 0, 0);
    const result = insertLink(sel, 'https://example.com');
    expect(result.replacement).toBe('[](https://example.com)');
    expect(result.newCursorOffset).toBe(1); // inside brackets
  });
});

describe('text-format: insertImage', () => {
  it('inserts image syntax with relative path', () => {
    const sel = makeSelection('', 0, 0);
    const result = insertImage(sel, './image.png');
    expect(result.replacement).toBe('![](./image.png)');
    expect(result.newCursorOffset).toBe(1); // cursor inside brackets
  });

  it('uses selected text as alt text', () => {
    const sel = makeSelection('my photo', 0, 8);
    const result = insertImage(sel, './photo.jpg');
    expect(result.replacement).toBe('![my photo](./photo.jpg)');
    expect(result.newCursorOffset).toBe(result.replacement.length); // at end
  });
});
