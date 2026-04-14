import { describe, it, expect } from 'vitest';
import { PositionMapManager } from '../../lib/position-map';
import type { PositionedNode } from '../../types/edit';

function makeNode(type: string, startLine: number, startCol: number, startOff: number, endLine: number, endCol: number, endOff: number, children?: PositionedNode[]): PositionedNode {
  return {
    type,
    position: {
      start: { line: startLine, column: startCol, offset: startOff },
      end: { line: endLine, column: endCol, offset: endOff },
    },
    children,
  };
}

describe('PositionMapManager', () => {
  // # Hello\n\nWorld foo bar\n\n## Section\nBaz
  // 0123456 7890123456789012 3456789012345678 901234
  const source = '# Hello\n\nWorld foo bar\n\n## Section\nBaz';

  const nodes: PositionedNode[] = [
    makeNode('heading', 1, 1, 0, 1, 8, 7),       // '# Hello' (7 chars)
    makeNode('paragraph', 3, 1, 9, 3, 14, 22, [
      makeNode('strong', 3, 7, 15, 3, 14, 22),
    ]),
    makeNode('heading', 5, 1, 24, 5, 10, 33),    // '## Section'
    makeNode('paragraph', 6, 1, 34, 6, 4, 37),   // 'Baz'
  ];

  it('build constructs entries for all nodes including children', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    const all = pm.getAll();
    // 4 top-level + 1 child (strong) = 5
    expect(all).toHaveLength(5);
    expect(all.map((e) => e.node.type)).toContain('strong');
  });

  it('build extracts correct sourceText', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    const heading = pm.findByOffset(1)!;
    expect(heading.sourceText).toBe('# Hello');
  });

  it('findByOffset finds the deepest (smallest range) node', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    // offset 16 falls inside both paragraph (8-21) and strong (14-21)
    const entry = pm.findByOffset(16)!;
    expect(entry.node.type).toBe('strong');
  });

  it('findByOffset returns null when no match', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    expect(pm.findByOffset(100)).toBeNull();
  });

  it('findByOffset returns null on empty map', () => {
    const pm = new PositionMapManager();
    expect(pm.findByOffset(0)).toBeNull();
  });

  it('findByOffset respects boundary (start inclusive, end exclusive)', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    // heading is 0-7, offset 7 should NOT match heading (end exclusive)
    const at7 = pm.findByOffset(7);
    if (at7) expect(at7.node.type).not.toBe('heading');
  });

  it('findByLine returns entries spanning that line', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    const line3 = pm.findByLine(3);
    expect(line3).toHaveLength(2); // paragraph + strong
  });

  it('findByLine returns empty for non-existent line', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    expect(pm.findByLine(99)).toHaveLength(0);
  });

  it('updateAfterEdit shifts entries after the edit region', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    // Insert 5 chars at offset 24 (just before "## Section")
    pm.updateAfterEdit(24, 0, 5);
    const all = pm.getAll();
    const sec = all.find((e) => e.node.type === 'heading' && e.startOffset > 24);
    expect(sec).toBeDefined();
    expect(sec!.startOffset).toBe(29); // was 24 + 5
  });

  it('updateAfterEdit removes entries overlapping the changed region', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    // Replace inside paragraph (offset 10-18, overlaps paragraph 9-22 and strong 15-22)
    pm.updateAfterEdit(10, 8, 3);
    const all = pm.getAll();
    const types = all.map((e) => e.node.type);
    // paragraph (9-22) overlaps [10,18) -> removed; strong (15-22) overlaps -> removed
    expect(types.filter(t => t === 'paragraph')).toHaveLength(1);
    expect(types).not.toContain('strong');
  });

  it('clear empties all entries', () => {
    const pm = new PositionMapManager();
    pm.build(source, nodes);
    pm.clear();
    expect(pm.getAll()).toHaveLength(0);
  });
});
