/**
 * F010 — 大纲导航侧边栏
 *
 * 从 Markdown 标题生成可折叠的目录树，
 * 支持点击跳转到编辑器对应行。
 */
import { useMemo } from 'react';
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

export function TocSidebar({ toc, onNavigate, activeId, visible = true }: TocSidebarProps) {
  // 构建带缩进的扁平列表（支持折叠逻辑预留）
  const items = useMemo(() => {
    if (toc.length === 0) return [];
    return toc.map((entry) => ({
      ...entry,
      indent: (entry.level - 1) * 16, // 每级缩进 16px
    }));
  }, [toc]);

  if (!visible) return null;

  return (
    <div className="w-60 shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-100">
        <List size={14} className="text-slate-500" />
        <span className="text-xs font-medium text-slate-600">大纲</span>
        <span className="text-xs text-slate-400 ml-auto">{toc.length} 项</span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-slate-400 text-center">未检测到标题<br/>使用 # 创建标题</p>
        </div>
      ) : (
        <nav className="flex-1 py-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id + '-' + item.position}
              onClick={() => onNavigate?.(item)}
              title={`跳转到: ${item.text}`}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-start gap-1.5 ${
                item.id === activeId
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                  : 'text-slate-600 hover:bg-slate-100 border-l-2 border-transparent'
              }`}
              style={{ paddingLeft: `${item.indent + 12}px` }}
            >
              {/* 折叠指示器（预留） */}
              <span className="shrink-0 mt-0.5 text-slate-400">
                <ChevronRight size={12} strokeWidth={1.8} />
              </span>
              <span className="truncate">{item.text}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
