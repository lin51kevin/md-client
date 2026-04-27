import { visit } from 'unist-util-visit';
import type { Root } from 'hast';

declare module 'hast' {
  interface RootContentMap {
    wikiLink: HTMLElement;
  }
}

/**
 * rehype 插件：将 wikiLink mdast 节点转为 <a class="wiki-link"> 元素
 */
export function rehypeWikiLinks() {
  return (tree: Root) => {
    visit(tree, 'wikiLink', (node: any) => {
      const target = node.value;
      Object.assign(node, {
        type: 'element',
        tagName: 'a',
        properties: {
          className: ['wiki-link'],
          'data-wiki-target': target,
          href: '#',
          title: `跳转到: ${target}`,
        },
        children: [{ type: 'text', value: target }],
      });
    });
  };
}
