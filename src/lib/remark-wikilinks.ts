import { visit } from 'unist-util-visit';
import type { Root, Text, PhrasingContent } from 'mdast';

export interface WikiLinkNode {
  type: 'wikiLink';
  value: string;
  children?: PhrasingContent[];
}

declare module 'mdast' {
  interface FrontmatterContentMap {
    wikiLink: WikiLinkNode;
  }
}

/**
 * remark 插件：解析 [[文档名]] 语法，生成 wikiLink 节点
 */
export function remarkWikiLinks() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const regex = /\[\[([^\]]+)\]\]/g;
      const text = node.value;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      const newNodes: PhrasingContent[] = [];

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          newNodes.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }
        newNodes.push({
          type: 'wikiLink',
          value: match[1].trim(),
        } as unknown as PhrasingContent);
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        newNodes.push({ type: 'text', value: text.slice(lastIndex) });
      }

      if (newNodes.length > 0) {
        parent.children.splice(index, 1, ...newNodes);
      }
    });
  };
}
