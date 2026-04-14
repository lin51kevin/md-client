import { describe, it, expect } from 'vitest';
import { MarkdownAST } from '../../lib/markdown-ast';
import type { PositionedNode } from '../../types/edit';

function nodeAt(ast: MarkdownAST, offset: number): PositionedNode | null {
  return ast.findNodeByOffset(offset);
}

describe('MarkdownAST', () => {
  describe('parsing', () => {
    it('parses basic markdown', () => {
      const ast = new MarkdownAST('# Hello\n\nWorld');
      expect(ast.getTree().type).toBe('root');
      expect(ast.getTree().children.length).toBeGreaterThan(0);
    });

    it('handles empty document', () => {
      const ast = new MarkdownAST('');
      expect(ast.getTree().type).toBe('root');
      expect(ast.getTree().children.length).toBe(0);
      expect(ast.findNodeByOffset(0)).toBeNull();
    });
  });

  describe('findNodeByOffset', () => {
    it('finds a heading', () => {
      const md = '# Hello\n\nWorld';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 2); // inside '# Hello'
      expect(node).not.toBeNull();
      expect(node!.type).toBe('heading');
    });

    it('finds a paragraph', () => {
      const md = 'Hello world\n\nSecond para';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 3);
      expect(node).not.toBeNull();
      expect(node!.type).toBe('paragraph');
    });

    it('finds a blockquote', () => {
      const md = '> Some quote\n\nOther';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 3);
      expect(node).not.toBeNull();
      expect(node!.type).toBe('blockquote');
    });

    it('finds a code block', () => {
      const md = '```\ncode\n```\n\nText';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 6);
      expect(node).not.toBeNull();
      expect(node!.type).toBe('code');
    });

    it('finds a list item', () => {
      const md = '- Item 1\n- Item 2\n\nText';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 4); // inside '- Item 1'
      expect(node).not.toBeNull();
      expect(node!.type).toBe('listItem');
    });

    it('finds nested list items', () => {
      const md = '- Parent\n  - Child\n\nAfter';
      const ast = new MarkdownAST(md);
      // offset for "Child" area
      const childOffset = md.indexOf('Child');
      const node = nodeAt(ast, childOffset);
      expect(node).not.toBeNull();
      expect(node!.type).toBe('listItem');
    });

    it('finds multi-level headings', () => {
      const md = '# H1\n## H2\n### H3';
      const ast = new MarkdownAST(md);
      expect(nodeAt(ast, 2)?.type).toBe('heading');
      expect(nodeAt(ast, 7)?.type).toBe('heading');
      expect(nodeAt(ast, 14)?.type).toBe('heading');
    });

    it('returns null for out-of-range offset', () => {
      const md = 'Hello';
      const ast = new MarkdownAST(md);
      expect(nodeAt(ast, 999)).toBeNull();
    });
  });

  describe('findNodeByPosition', () => {
    it('finds node by line and column', () => {
      const md = '# Title\n\nParagraph text';
      const ast = new MarkdownAST(md);
      const node = ast.findNodeByPosition(1, 3);
      expect(node).not.toBeNull();
      expect(node!.type).toBe('heading');
    });
  });

  describe('getSourceText', () => {
    it('extracts paragraph text', () => {
      const md = 'Hello world\n\nSecond';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 3)!;
      expect(ast.getSourceText(node, md)).toBe('Hello world');
    });

    it('extracts heading text including marker', () => {
      const md = '# Hello\n\nWorld';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 2)!;
      expect(ast.getSourceText(node, md)).toBe('# Hello');
    });
  });

  describe('replaceNodeContent', () => {
    it('replaces paragraph content precisely', () => {
      const md = 'First para\n\nSecond para';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 2)!;
      const result = ast.replaceNodeContent(md, node, 'New para');
      expect(result).toBe('New para\n\nSecond para');
    });

    it('does not replace wrong occurrence of duplicate text', () => {
      const md = 'Same text\n\nSame text\n\nOther';
      const ast = new MarkdownAST(md);
      // Get the second occurrence (starts at offset 11)
      const secondNode = nodeAt(ast, 14)!;
      expect(ast.getSourceText(secondNode, md)).toBe('Same text');
      const result = ast.replaceNodeContent(md, secondNode, 'Replaced');
      expect(result).toBe('Same text\n\nReplaced\n\nOther');
    });

    it('replaces code block content', () => {
      const md = '```\nold code\n```\n\nText after';
      const ast = new MarkdownAST(md);
      const node = nodeAt(ast, 6)!;
      const result = ast.replaceNodeContent(md, node, '```\nnew code\n```');
      expect(result).toBe('```\nnew code\n```\n\nText after');
    });
  });

  describe('buildPositionMap', () => {
    it('builds map for all nodes', () => {
      const md = '# Hello\n\nWorld';
      const ast = new MarkdownAST(md);
      const map = ast.buildPositionMap(md);
      expect(map.size).toBeGreaterThan(0);
    });

    it('entries have correct offsets', () => {
      const md = 'AAA\n\nBBB';
      const ast = new MarkdownAST(md);
      const map = ast.buildPositionMap(md);
      let found = false;
      for (const [, entry] of map) {
        if (entry.node.type === 'paragraph' && entry.sourceText === 'BBB') {
          expect(entry.startOffset).toBe(5);
          expect(entry.endOffset).toBe(8);
          found = true;
        }
      }
      expect(found).toBe(true);
    });
  });
});
