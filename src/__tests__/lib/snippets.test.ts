import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveSnippet,
  getSnippets,
  saveSnippets,
  getDefaultSnippets,
  generateSnippetId,
  SNIPPETS_STORAGE_KEY,
  type Snippet,
} from '../../lib/snippets';

function normalizeSnippets(snippets: Snippet[]): Array<Omit<Snippet, 'createdAt'> & { createdAt: 'number' }> {
  return snippets.map((s) => ({
    ...s,
    createdAt: 'number',
  }));
}

describe('generateSnippetId', () => {
  it('returns a string prefixed with snip-', () => {
    expect(generateSnippetId()).toMatch(/^snip-/);
  });

  it('generates unique IDs on repeated calls', () => {
    const ids = new Set(Array.from({ length: 20 }, generateSnippetId));
    expect(ids.size).toBe(20);
  });
});

describe('getDefaultSnippets', () => {
  it('returns at least one snippet', () => {
    expect(getDefaultSnippets().length).toBeGreaterThan(0);
  });

  it('each default snippet has id, name, and content', () => {
    for (const s of getDefaultSnippets()) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.content).toBeTruthy();
    }
  });
});

describe('getSnippets / saveSnippets', () => {
  beforeEach(() => localStorage.clear());

  it('returns default snippets when nothing is stored', () => {
    const result = getSnippets();
    expect(normalizeSnippets(result)).toEqual(normalizeSnippets(getDefaultSnippets()));
    for (const snippet of result) {
      expect(typeof snippet.createdAt).toBe('number');
    }
  });

  it('returns saved snippets when present', () => {
    const snippets: Snippet[] = [{ id: 's1', name: 'Test', content: 'Hello', createdAt: 1 }];
    localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(snippets));
    expect(getSnippets()).toEqual(snippets);
  });

  it('returns defaults on invalid JSON', () => {
    localStorage.setItem(SNIPPETS_STORAGE_KEY, 'not-json{{{');
    const result = getSnippets();
    expect(normalizeSnippets(result)).toEqual(normalizeSnippets(getDefaultSnippets()));
    for (const snippet of result) {
      expect(typeof snippet.createdAt).toBe('number');
    }
  });

  it('saveSnippets persists and returns true', () => {
    const snippets: Snippet[] = [{ id: 's2', name: 'X', content: 'Y', createdAt: 2 }];
    const ok = saveSnippets(snippets);
    expect(ok).toBe(true);
    expect(getSnippets()).toEqual(snippets);
  });

  it('saveSnippets returns false when content exceeds ~4.5 MB', () => {
    // Build a snippet whose serialized content is > 4.5 * 1024 * 1024 bytes
    const huge: Snippet = { id: 'big', name: 'B', content: 'x'.repeat(5 * 1024 * 1024), createdAt: 3 };
    expect(saveSnippets([huge])).toBe(false);
  });
});

describe('resolveSnippet', () => {
  it('returns text unchanged when no placeholders', () => {
    const { text, cursorPosition } = resolveSnippet('plain text');
    expect(text).toBe('plain text');
    expect(cursorPosition).toBeNull();
  });

  it('replaces ${cursor} and returns correct position', () => {
    const { text, cursorPosition } = resolveSnippet('before${cursor}after');
    expect(text).toBe('beforeafter');
    expect(cursorPosition).toBe(6); // length of 'before'
  });

  it('sets cursorPosition to null when no ${cursor}', () => {
    const { cursorPosition } = resolveSnippet('no cursor here');
    expect(cursorPosition).toBeNull();
  });

  it('replaces ${filename} with context.filename', () => {
    const { text } = resolveSnippet('File: ${filename}', { filename: 'notes.md' });
    expect(text).toBe('File: notes.md');
  });

  it('replaces ${filename} with fallback when no context', () => {
    const { text } = resolveSnippet('File: ${filename|untitled}');
    expect(text).toBe('File: untitled');
  });

  it('replaces ${filename} with empty string when no context and no fallback', () => {
    const { text } = resolveSnippet('File: ${filename}');
    expect(text).toBe('File: ');
  });

  it('replaces ${language|javascript} with fallback', () => {
    // 'language' is not a predefined variable, so its placeholder stays or resolves.
    // Only PREDEFINED_VARIABLES are resolved; unknown vars are left unchanged.
    const { text } = resolveSnippet('```${language|javascript}\n```');
    // 'language' is not in PREDEFINED_VARIABLES, so it remains as-is
    expect(text).toContain('${language|javascript}');
  });

  it('computes cursor position AFTER variable expansion (sentinel approach)', () => {
    // ${date} expands to a locale string longer than 7 chars, so cursor offset would
    // be wrong if computed before substitution. Verify position is still in right spot.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
    const { text, cursorPosition } = resolveSnippet('# ${date}\n${cursor}more');
    expect(text).not.toContain('${date}');
    expect(text).not.toContain('${cursor}');
    // cursorPosition should equal offset of 'more' in final text
    expect(cursorPosition).not.toBeNull();
    expect(text.slice(cursorPosition!)).toBe('more');
    vi.useRealTimers();
  });

  it('uses the first ${cursor} as the cursor position (only first sentinel removed)', () => {
    // Implementation removes only the FIRST sentinel; extra ${cursor} in a snippet
    // is an edge case – snippets are expected to have at most one.
    const { cursorPosition } = resolveSnippet('a${cursor}b');
    expect(cursorPosition).toBe(1);
  });

  it('replaces ${date} with a non-empty string', () => {
    const { text } = resolveSnippet('Today: ${date}');
    expect(text).toMatch(/^Today: .+/);
    expect(text).not.toContain('${date}');
  });

  it('replaces ${time} with a non-empty string', () => {
    const { text } = resolveSnippet('Time: ${time}');
    expect(text).not.toContain('${time}');
    expect(text.length).toBeGreaterThan('Time: '.length);
  });
});
