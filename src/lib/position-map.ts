import type { PositionedNode, PositionMapEntry } from '../types/edit';

/**
 * 位置映射管理器
 * 维护 AST 节点到源码位置的映射关系
 */
export class PositionMapManager {
  private entries: Map<string, PositionMapEntry>;

  constructor() {
    this.entries = new Map();
  }

  /**
   * 从源码和节点列表构建位置映射
   */
  build(source: string, nodes: PositionedNode[]): void {
    this.entries.clear();
    this.collectEntries(source, nodes);
  }

  private collectEntries(source: string, nodes: PositionedNode[]): void {
    for (const node of nodes) {
      if (node.position) {
        const start = node.position.start.offset;
        const end = node.position.end.offset;
        const key = `${node.type}:${start}:${end}`;
        this.entries.set(key, {
          node,
          sourceText: source.slice(start, end),
          startOffset: start,
          endOffset: end,
        });
      }
      if (node.children?.length) {
        this.collectEntries(source, node.children);
      }
    }
  }

  /**
   * 根据源码偏移量查找对应的节点
   * 返回 offset 落在节点范围内的最深节点（最小范围）
   */
  findByOffset(offset: number): PositionMapEntry | null {
    let best: PositionMapEntry | null = null;
    let bestSize = Infinity;

    for (const entry of this.entries.values()) {
      if (entry.startOffset <= offset && offset < entry.endOffset) {
        const size = entry.endOffset - entry.startOffset;
        if (size < bestSize) {
          bestSize = size;
          best = entry;
        }
      }
    }
    return best;
  }

  /**
   * 根据行号查找
   */
  findByLine(line: number): PositionMapEntry[] {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.node.position.start.line <= line && line <= entry.node.position.end.line
    );
  }

  /**
   * 当源码被修改后，更新受影响的位置映射
   */
  updateAfterEdit(changeOffset: number, oldLength: number, newLength: number): void {
    const delta = newLength - oldLength;
    if (delta === 0) return;

    const updated = new Map<string, PositionMapEntry>();
    for (const [key, entry] of this.entries) {
      if (entry.startOffset >= changeOffset + oldLength) {
        // Entry is after the changed region, shift it
        const newEntry: PositionMapEntry = {
          ...entry,
          startOffset: entry.startOffset + delta,
          endOffset: entry.endOffset + delta,
        };
        // Update node position offsets too
        newEntry.node = {
          ...entry.node,
          position: {
            start: { ...entry.node.position.start, offset: entry.node.position.start.offset + delta },
            end: { ...entry.node.position.end, offset: entry.node.position.end.offset + delta },
          },
        };
        const newKey = `${newEntry.node.type}:${newEntry.startOffset}:${newEntry.endOffset}`;
        updated.set(newKey, newEntry);
      } else if (entry.endOffset <= changeOffset) {
        // Entry is before the changed region, keep it
        updated.set(key, entry);
      }
      // Entries overlapping the changed region are removed (stale)
    }
    this.entries = updated;
  }

  /**
   * 获取所有映射条目
   */
  getAll(): PositionMapEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * 清空映射
   */
  clear(): void {
    this.entries.clear();
  }
}
