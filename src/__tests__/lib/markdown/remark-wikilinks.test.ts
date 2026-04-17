import { describe, it, expect } from 'vitest';
import { remarkWikiLinks } from '../../../lib/markdown/remark-wikilinks';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

function process(md: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkWikiLinks);
  const ast = processor.parse(md);
  return processor.runSync(ast);
}

describe('remarkWikiLinks', () => {
  it('parses [[笔记]] as wikiLink node', () => {
    const tree = process('查看[[笔记]]获取详情');
    const links = (tree as any).children?.flatMap(
      (n: any) => (n.type === 'paragraph' ? n.children : [])
    ).filter((n: any) => n.type === 'wikiLink');
    expect(links).toHaveLength(1);
    expect(links[0].value).toBe('笔记');
  });

  it('trims spaces in [[  带空格  ]]', () => {
    const tree = process('链接到[[  带空格  ]]');
    const links = (tree as any).children?.flatMap(
      (n: any) => (n.type === 'paragraph' ? n.children : [])
    ).filter((n: any) => n.type === 'wikiLink');
    expect(links[0].value).toBe('带空格');
  });

  it('leaves plain text unchanged when no [[]] present', () => {
    const tree = process('这是一段普通文本');
    const paras = (tree as any).children;
    // Should have no wikiLink nodes
    const allNodes = paras?.flatMap((p: any) => p.children ?? []) ?? [];
    expect(allNodes.find((n: any) => n.type === 'wikiLink')).toBeUndefined();
  });

  it('parses multiple [[]] on the same line', () => {
    const tree = process('参考[[A]]和[[B]]两个文档');
    const links = (tree as any).children?.flatMap(
      (n: any) => (n.type === 'paragraph' ? n.children : [])
    ).filter((n: any) => n.type === 'wikiLink');
    expect(links).toHaveLength(2);
    expect(links[0].value).toBe('A');
    expect(links[1].value).toBe('B');
  });
});
