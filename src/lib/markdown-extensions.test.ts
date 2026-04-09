import { describe, it, expect } from 'vitest';
import { extractFootnotes, buildFootnoteHtml, extractFrontmatter, buildFrontmatterHtml } from './markdown-extensions';

describe('markdown-extensions: extractFootnotes', () => {
  it('extracts basic footnotes', () => {
    const md = `Some text with a footnote[^1].

[^1]: This is the footnote content.`;
    const footnotes = extractFootnotes(md);
    expect(footnotes).toHaveLength(1);
    expect(footnotes[0].id).toBe('1');
    expect(footnotes[0].def).toBe('This is the footnote content.');
  });

  it('extracts multiple footnotes', () => {
    const md = `First[^note1] and second[^note2].

[^note1]: First definition.
[^note2]: Second definition.`;
    const footnotes = extractFootnotes(md);
    expect(footnotes).toHaveLength(2);
    expect(footnotes[0].id).toBe('note1');
    expect(footnotes[1].id).toBe('note2');
  });

  it('returns empty array when no footnotes', () => {
    const md = 'Just regular text without footnotes.';
    const footnotes = extractFootnotes(md);
    expect(footnotes).toHaveLength(0);
  });

  it('handles footnotes with paragraphs', () => {
    const md = `Text[^long].

[^long]: This footnote has multiple lines.
  Each line is separated.`;
    const footnotes = extractFootnotes(md);
    expect(footnotes).toHaveLength(1);
    expect(footnotes[0].id).toBe('long');
    expect(footnotes[0].def).toContain('This footnote has multiple lines');
  });
});

describe('markdown-extensions: buildFootnoteHtml', () => {
  it('generates footnote list HTML', () => {
    const footnotes = [
      { id: '1', def: 'First footnote.' },
      { id: '2', def: 'Second footnote.' },
    ];
    const html = buildFootnoteHtml(footnotes);
    expect(html).toContain('href="#fnref-1"');
    expect(html).toContain('id="fn-1"');
    expect(html).toContain('First footnote.');
  });

  it('returns empty string for empty footnotes', () => {
    const html = buildFootnoteHtml([]);
    expect(html).toBe('');
  });
});

describe('markdown-extensions: extractFrontmatter', () => {
  it('extracts YAML frontmatter', () => {
    const md = `---\ntitle: My Document\nauthor: John\n---\n\nContent here.`;
    const fm = extractFrontmatter(md);
    expect(fm.title).toBe('My Document');
    expect(fm.author).toBe('John');
    expect(fm.tags).toBeUndefined();
  });

  it('extracts frontmatter with tags array', () => {
    const md = `---\ntitle: Post\ntags:\n  - tech\n  - writing\n---\n\nBody.`;
    const fm = extractFrontmatter(md);
    expect(fm.title).toBe('Post');
    expect(fm.tags).toEqual(['tech', 'writing']);
  });

  it('returns empty object when no frontmatter', () => {
    const md = 'Just regular markdown without frontmatter.';
    const fm = extractFrontmatter(md);
    expect(fm).toEqual({});
  });

  it('returns empty object for empty frontmatter', () => {
    const md = '---\n---\n\nContent.';
    const fm = extractFrontmatter(md);
    expect(fm).toEqual({});
  });
});

describe('markdown-extensions: buildFrontmatterHtml', () => {
  it('renders frontmatter as styled HTML block', () => {
    const fm = { title: 'Test', author: 'Alice' };
    const html = buildFrontmatterHtml(fm);
    expect(html).toContain('<div');
    expect(html).toContain('Test');
    expect(html).toContain('Alice');
  });

  it('returns empty string for empty frontmatter', () => {
    const html = buildFrontmatterHtml({});
    expect(html).toBe('');
  });
});
