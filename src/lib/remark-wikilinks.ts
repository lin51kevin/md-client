import { visit } from 'unist-util-visit';
import type { Root, Text, PhrasingContent } from 'mdast';

export interface WikiLinkNode {
  type: 'wikiLink';
  value: string;
  children?: PhrasingContent[];
}

declare module 'mdast' {
  // [W7 FIX] wikiLink is inline phrasing content, not frontmatter
  interface PhrasingContentMap {
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
        // [W3 DEFENSE] Guard against extremely long link names (slice to 100 chars)
        newNodes.push({
          type: 'wikiLink',
          value: match[1].trim().slice(0, 100),
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
