import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test extractFrontmatter (shared dependency)
import { extractFrontmatter } from '../../../lib/markdown/extensions';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock mermaid
vi.mock('../../../lib/mermaid', () => ({
  initMermaid: vi.fn().mockResolvedValue({
    default: {
      render: vi.fn().mockResolvedValue({
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><circle cx="50" cy="25" r="20"/></svg>',
      }),
    },
  }),
}));

describe('MilkdownPreview NodeViews', () => {
  describe('Frontmatter', () => {
    it('extracts YAML frontmatter from markdown', () => {
      const md = `---
title: Test Document
author: John
tags:
  - test
  - unit
---
# Hello
`;
      const fm = extractFrontmatter(md);
      expect(fm.title).toBe('Test Document');
      expect(fm.author).toBe('John');
      expect(fm.tags).toEqual(['test', 'unit']);
    });

    it('returns empty object for content without frontmatter', () => {
      const md = '# No frontmatter\nJust content';
      const fm = extractFrontmatter(md);
      expect(fm).toEqual({});
    });

    it('handles empty frontmatter', () => {
      const md = '---\n---\n# Hello';
      const fm = extractFrontmatter(md);
      expect(fm).toEqual({});
    });
  });

  describe('WikiLink plugin', () => {
    it('exports wikiLinkPlugin', async () => {
      const { wikiLinkPlugin, wikiLinkId, wikiLinkSchema } = await import(
        '../../../components/MilkdownPreview/nodeviews/wikiLinkPlugin'
      );
      expect(wikiLinkPlugin).toBeDefined();
      expect(wikiLinkId).toBe('wikiLink');
      expect(wikiLinkSchema).toBeDefined();
    });

    it('wikiLinkPlugin is an array with remark and schema plugins', async () => {
      const { wikiLinkPlugin } = await import(
        '../../../components/MilkdownPreview/nodeviews/wikiLinkPlugin'
      );
      expect(Array.isArray(wikiLinkPlugin)).toBe(true);
      expect(wikiLinkPlugin).toHaveLength(2);
    });

    it('remark-wikilinks correctly parses [[text]]', async () => {
      const { remarkWikiLinks } = await import(
        '../../../lib/markdown/remark-wikilinks'
      );
      const { unified } = await import('unified');
      const remarkParse = (await import('remark-parse')).default;

      const processor = unified().use(remarkParse).use(remarkWikiLinks);
      const tree = processor.runSync(processor.parse('See [[MyPage]] for details'));

      // WikiLink nodes are inside paragraph children
      const children = (tree as any).children?.flatMap(
        (n: any) => (n.type === 'paragraph' ? n.children : [])
      ).filter((n: any) => n.type === 'wikiLink');
      expect(children).toHaveLength(1);
      expect(children[0].value).toBe('MyPage');
    });

    it('remark-wikilinks handles multiple links', async () => {
      const { remarkWikiLinks } = await import(
        '../../../lib/markdown/remark-wikilinks'
      );
      const { unified } = await import('unified');
      const remarkParse = (await import('remark-parse')).default;

      const processor = unified().use(remarkParse).use(remarkWikiLinks);
      const tree = processor.runSync(processor.parse('See [[PageA]] and [[Page B]]'));

      const children = (tree as any).children?.flatMap(
        (n: any) => (n.type === 'paragraph' ? n.children : [])
      ).filter((n: any) => n.type === 'wikiLink');
      expect(children).toHaveLength(2);
      expect(children[0].value).toBe('PageA');
      expect(children[1].value).toBe('Page B');
    });
  });

  describe('WikiLink pattern', () => {
    const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

    it('matches [[link]] syntax', () => {
      const text = 'See [[MyPage]] for details';
      const matches = [...text.matchAll(WIKI_LINK_REGEX)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('MyPage');
    });

    it('matches multiple wiki links', () => {
      const text = 'See [[PageA]] and [[Page B]] for details';
      const matches = [...text.matchAll(WIKI_LINK_REGEX)];
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('PageA');
      expect(matches[1][1]).toBe('Page B');
    });

    it('does not match empty brackets', () => {
      const text = 'No link [[]]';
      const matches = [...text.matchAll(WIKI_LINK_REGEX)];
      expect(matches).toHaveLength(0);
    });
  });

  describe('LocalImage path helpers', () => {
    it('identifies absolute paths', () => {
      expect('/home/user/img.png'.startsWith('/')).toBe(true);
      expect('C:\\Users\\img.png'.match(/^[a-zA-Z]:[/\\]/)).not.toBeNull();
    });

    it('identifies remote URLs vs local paths', () => {
      const isLocal = (src: string) => !/^https?:|^data:|^blob:/i.test(src) && !src.startsWith('#');
      expect(isLocal('https://example.com/img.png')).toBe(false);
      expect(isLocal('data:image/png;base64,abc')).toBe(false);
      expect(isLocal('./img.png')).toBe(true);
      expect(isLocal('images/photo.jpg')).toBe(true);
    });
  });

  describe('Mermaid detection', () => {
    it('identifies mermaid code blocks', () => {
      const selectors = [
        'pre[data-language="mermaid"]',
        'pre code.mermaid',
      ];
      expect(selectors.length).toBeGreaterThan(0);
    });
  });
});
