import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkDirective from 'remark-directive';
import rehypeStringify from 'rehype-stringify';
import { remarkCallouts } from '../../../lib/markdown/remark-callouts';
import { rehypeCallouts } from '../../../lib/markdown/rehype-callouts';

/** Process markdown through the full pipeline and return HTML string. */
function render(md: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkCallouts)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeCallouts)
      .use(rehypeStringify)
      .processSync(md)
  );
}

describe('callouts', () => {
  it('should parse > [!info] syntax and render info block', () => {
    const html = render('> [!info]\n> Some info text');
    expect(html).toContain('callout');
    expect(html).toContain('callout-info');
    expect(html).toContain('Some info text');
  });

  it('should support warning, danger, tip, note, abstract, todo, question types', () => {
    const types = ['warning', 'danger', 'tip', 'note', 'abstract', 'todo', 'question'];
    for (const type of types) {
      const html = render(`> [!${type}]\n> content`);
      expect(html).toContain(`callout-${type}`);
      expect(html).toContain('content');
    }
  });

  it('should render title when provided', () => {
    const html = render('> [!tip] Custom Title\n> This is the body');
    expect(html).toContain('Custom Title');
    expect(html).toContain('This is the body');
  });

  it('should support collapsible syntax > [!note]-', () => {
    const html = render('> [!note]- Click to expand\n> Hidden content');
    expect(html).toContain('callout');
    expect(html).toContain('callout-note');
    expect(html).toContain('Hidden content');
  });

  it('should render content inside callout', () => {
    const html = render('> [!warning]\n> Line one\n> Line two\n> **bold**');
    expect(html).toContain('Line one');
    expect(html).toContain('Line two');
    expect(html).toContain('bold');
  });

  it('should not affect regular blockquotes', () => {
    const html = render('> This is a normal blockquote\n> with no callout syntax');
    expect(html).not.toContain('callout');
  });

  it('should handle callout with no content', () => {
    const html = render('> [!info]');
    expect(html).toContain('callout-info');
  });

  it('should handle > [!note]+ (always open) syntax', () => {
    const html = render('> [!note]+ Always Open\n> Content here');
    expect(html).toContain('callout');
    expect(html).toContain('Content here');
  });
});
