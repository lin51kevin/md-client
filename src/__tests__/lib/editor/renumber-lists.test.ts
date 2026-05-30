import { describe, it, expect } from 'vitest';
import { renumberOrderedListsInMarkdown } from '../../../lib/editor/renumber-lists';

describe('renumberOrderedListsInMarkdown', () => {
  // ── Simple cases ────────────────────────────────────────────────────────

  it('leaves a document with no ordered lists unchanged', () => {
    const text = 'Hello world\n\n- bullet\n- item';
    expect(renumberOrderedListsInMarkdown(text)).toBe(text);
  });

  it('leaves a correctly-numbered list unchanged', () => {
    const text = '1. alpha\n2. beta\n3. gamma';
    expect(renumberOrderedListsInMarkdown(text)).toBe(text);
  });

  it('renumbers a list with gaps', () => {
    const text = '1. a\n3. b\n5. c';
    expect(renumberOrderedListsInMarkdown(text)).toBe('1. a\n2. b\n3. c');
  });

  it('renumbers a list that starts from a number other than 1', () => {
    const text = '5. first\n6. second\n7. third';
    expect(renumberOrderedListsInMarkdown(text)).toBe('1. first\n2. second\n3. third');
  });

  it('renumbers a single-item list', () => {
    expect(renumberOrderedListsInMarkdown('42. only item')).toBe('1. only item');
  });

  // ── Multi-block (blank-line reset) ─────────────────────────────────────

  it('treats each blank-line-separated block as an independent list', () => {
    const text = '1. a\n3. b\n\n1. x\n5. y';
    expect(renumberOrderedListsInMarkdown(text)).toBe('1. a\n2. b\n\n1. x\n2. y');
  });

  it('preserves blank lines between separate lists', () => {
    const text = '2. first\n\n3. second';
    expect(renumberOrderedListsInMarkdown(text)).toBe('1. first\n\n1. second');
  });

  it('does not merge two lists separated by a blank line', () => {
    const result = renumberOrderedListsInMarkdown('2. a\n\n4. b');
    const [block1, , block2] = result.split('\n');
    expect(block1).toBe('1. a');
    expect(block2).toBe('1. b');
  });

  // ── Nested lists ─────────────────────────────────────────────────────────

  it('renumbers a nested list independently of the parent', () => {
    const text = '1. parent\n   3. child a\n   5. child b\n2. sibling';
    const expected = '1. parent\n   1. child a\n   2. child b\n2. sibling';
    expect(renumberOrderedListsInMarkdown(text)).toBe(expected);
  });

  it('resets deeper indent counters when returning to shallower indent', () => {
    const text = '1. top\n   2. nested\n   4. nested\n3. top again';
    const expected = '1. top\n   1. nested\n   2. nested\n2. top again';
    expect(renumberOrderedListsInMarkdown(text)).toBe(expected);
  });

  it('handles three levels of nesting', () => {
    const text = '1. a\n   2. b\n      3. c\n      5. d\n   4. e\n2. f';
    const expected = '1. a\n   1. b\n      1. c\n      2. d\n   2. e\n2. f';
    expect(renumberOrderedListsInMarkdown(text)).toBe(expected);
  });

  // ── Mixed content ─────────────────────────────────────────────────────────

  it('leaves non-list lines untouched', () => {
    const text = '# Heading\n\n1. a\n2. b\n\nParagraph text\n\n3. x\n5. y';
    const expected = '# Heading\n\n1. a\n2. b\n\nParagraph text\n\n1. x\n2. y';
    expect(renumberOrderedListsInMarkdown(text)).toBe(expected);
  });

  it('does not modify unordered list items', () => {
    const text = '- bullet\n* also bullet\n+ still bullet';
    expect(renumberOrderedListsInMarkdown(text)).toBe(text);
  });

  it('handles a list inside a document with frontmatter', () => {
    const text = '---\ntitle: test\n---\n\n1. a\n3. b';
    expect(renumberOrderedListsInMarkdown(text)).toBe('---\ntitle: test\n---\n\n1. a\n2. b');
  });

  // ── Immutability ─────────────────────────────────────────────────────────

  it('returns a new string without mutating input', () => {
    const original = '1. a\n3. b';
    const copy = original;
    const result = renumberOrderedListsInMarkdown(original);
    expect(result).toBe('1. a\n2. b');
    expect(original).toBe(copy); // original unchanged
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('handles an empty string', () => {
    expect(renumberOrderedListsInMarkdown('')).toBe('');
  });

  it('handles a string with only blank lines', () => {
    expect(renumberOrderedListsInMarkdown('\n\n\n')).toBe('\n\n\n');
  });

  it('preserves trailing content on each list item', () => {
    const text = '3. Hello, World!\n5. foo *bar* baz';
    expect(renumberOrderedListsInMarkdown(text)).toBe('1. Hello, World!\n2. foo *bar* baz');
  });
});
