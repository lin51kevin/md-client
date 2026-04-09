/**
 * F010 — 大纲导航侧边栏
 *
 * 从 Markdown 标题生成可折叠的目录树，
 * 支持点击条目跳转、点击箭头折叠/展开子节点。
 */
import { useState, useMemo } from 'react';
import { List, ChevronRight } from 'lucide-react';
import type { TocEntry } from '../lib/toc';

interface TocSidebarProps {
  /** 提取的标题列表 */
  toc: TocEntry[];
  /** 点击条目时的回调 */
  onNavigate?: (entry: TocEntry) => void;
  /** 当前激活的条目 ID */
  activeId?: string | null;
  /** 是否可见 */
  visible?: boolean;
}

/** 只展示到 h3 */
const MAX_TOC_LEVEL = 3;

type FlatItem = TocEntry & { indent: number; hasChildren: boolean };

export function TocSidebar({ toc, onNavigate, activeId, visible = true }: TocSidebarProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // 过滤 h1-h3，标记每项是否有子节点
  const items = useMemo<FlatItem[]>(() => {
    const filtered = toc.filter(e => e.level <= MAX_TOC_LEVEL);
    return filtered.map((entry, i) => ({
      ...entry,
      indent: (entry.level - 1) * 12,
      // 有子节点 = 紧随其后的条目层级更深
      hasChildren: i + 1 < filtered.length && filtered[i + 1].level > entry.level,
    }));
  }, [toc]);

  // 根据折叠状态计算实际可见条目（使用祖先栈算法）
  const visibleItems = useMemo<FlatItem[]>(() => {
    const result: FlatItem[] = [];
    const stack: Array<{ level: number; collapsed: boolean }> = [];
    for (const item of items) {
      // 弹出层级 >= 当前层级的祖先
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }
      // 若任意祖先已折叠则隐藏当前条目
      const hidden = stack.some(s => s.collapsed);
      if (!hidden) result.push(item);
      // 无论是否隐藏都入栈（子树判断需要）
      stack.push({ level: item.level, collapsed: collapsedIds.has(item.id) });
    }
    return result;
  }, [items, collapsedIds]);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!visible) return null;

  return (
    <div className="w-60 shrink-0 h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
      <div className="shrink-0 flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
        <List size={14} style={{ color: 'var(--text-secondary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>大纲</span>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>{items.length} 项</span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>未检测到标题<br/>使用 # 创建标题</p>
        </div>
      ) : (
        <nav className="flex-1 py-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = item.id === activeId;
            const isCollapsed = collapsedIds.has(item.id);
            return (
              <div
                key={item.id + '-' + item.position}
                className={`flex items-center border-l-2 ${
                  isActive ? 'border-blue-500' : 'border-transparent'
                }`}
                style={{
                  paddingLeft: `${item.indent}px`,
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--accent-color) 12%, transparent)'
                    : undefined,
                }}
              >
                {/* 折叠/展开箭头（仅有子节点时显示） */}
                <button
                  onClick={item.hasChildren ? (e) => toggleCollapse(item.id, e) : undefined}
                  className="shrink-0 flex items-center justify-center w-5 h-6"
                  style={{ color: 'var(--text-secondary)', cursor: item.hasChildren ? 'pointer' : 'default', opacity: item.hasChildren ? 1 : 0 }}
                  tabIndex={item.hasChildren ? 0 : -1}
                  aria-label={isCollapsed ? '展开' : '折叠'}
                >
                  <ChevronRight
                    size={11}
                    strokeWidth={2}
                    style={{ transition: 'transform 0.15s', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                  />
                </button>

                {/* 跳转按钮 */}
                <button
                  onClick={() => onNavigate?.(item)}
                  title={`跳转到: ${item.text}`}
                  className="flex-1 text-left py-1.5 pr-2 text-xs truncate transition-colors"
                  style={{ color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)' }}
                >
                  {item.text}
                </button>
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}
