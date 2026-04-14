import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root } from 'mdast';
import type { ASTPosition, PositionedNode, PositionMapEntry } from '../types/edit';

// Container types that should be skipped to find the editable block inside
const CONTAINER_TYPES = new Set(['list', 'root']);

const BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'blockquote', 'list', 'listItem', 'code',
]);

let nodeIdCounter = 0;
function assignNodeId(node: any): void {
  if (node && !node._nodeId) {
    node._nodeId = `n_${++nodeIdCounter}`;
  }
  if (node?.children) {
    for (const child of node.children) assignNodeId(child);
  }
}

export class MarkdownAST {
  private tree: Root;
  private source: string;

  constructor(markdown: string) {
    this.source = markdown;
    this.tree = unified().use(remarkParse).parse(markdown) as Root;
    assignNodeId(this.tree);
  }

  getTree(): Root {
    return this.tree;
  }

  findNodeByOffset(offset: number): PositionedNode | null {
    // Return the outermost block-level node containing the offset.
    // This is the most useful for editing (e.g., clicking inside a blockquote
    // should return the blockquote, not the paragraph inside it).
    const findOutermostBlock = (node: any): PositionedNode | null => {
      const pos = node.position as ASTPosition | undefined;
      if (!pos || !(pos.start.offset <= offset && offset < pos.end.offset)) return null;
      // If this node is a block type but a container, skip to children
      if (BLOCK_TYPES.has(node.type) && CONTAINER_TYPES.has(node.type)) {
        if (node.children) {
          for (const child of node.children) {
            const found = findOutermostBlock(child);
            if (found) return found;
          }
        }
        return null;
      }
      // If this node is a block type, return it (don't go deeper)
      if (BLOCK_TYPES.has(node.type)) {
        return {
          type: node.type, position: pos, _nodeId: node._nodeId,
          ...(node.children ? { children: node.children } : {}),
        } as any;
      }
      // Not a block type — recurse into children
      if (node.children) {
        for (const child of node.children) {
          const found = findOutermostBlock(child);
          if (found) return found;
        }
      }
      return null;
    };
    return findOutermostBlock(this.tree);
  }

  findNodeByPosition(line: number, column: number): PositionedNode | null {
    // Convert line:column to approximate offset
    const lines = this.source.split('\n');
    let offset = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    offset += column - 1;
    return this.findNodeByOffset(offset);
  }

  getSourceText(node: PositionedNode, source: string): string {
    const { start, end } = node.position;
    return source.slice(start.offset, end.offset);
  }

  replaceNodeContent(source: string, node: PositionedNode, newContent: string): string {
    const { start, end } = node.position;
    return source.slice(0, start.offset) + newContent + source.slice(end.offset);
  }

  buildPositionMap(source: string): Map<string, PositionMapEntry> {
    const map = new Map<string, PositionMapEntry>();
    const walk = (node: any) => {
      const pos = node.position as ASTPosition | undefined;
      if (pos) {
        const text = source.slice(pos.start.offset, pos.end.offset);
        const key = node._nodeId || `${node.type}_${pos.start.offset}`;
        map.set(key, {
          node: {
            type: node.type,
            position: pos,
            _nodeId: node._nodeId,
            ...(node.children ? { children: node.children } : {}),
          } as any,
          sourceText: text,
          startOffset: pos.start.offset,
          endOffset: pos.end.offset,
        });
      }
      if (node.children) {
        for (const child of node.children) walk(child);
      }
    };
    walk(this.tree);
    return map;
  }
}
