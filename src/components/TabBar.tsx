import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tab } from '../types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onReorder: (fromId: string, toId: string) => void;
  onContextMenu: (x: number, y: number, tabId: string) => void;
  getTabTitle: (tab: Tab) => string;
  /** F013: 当前正在重命名的 tab ID */
  renamingTabId?: string | null;
  /** F013: 开始重命名 */
  onStartRename?: (id: string) => void;
  /** F013: 确认重命名 */
  onConfirmRename?: (id: string, name: string) => void;
  /** F013: 取消重命名 */
  onCancelRename?: () => void;
}

export function TabBar({ tabs, activeTabId, onActivate, onClose, onNew, onReorder, onContextMenu, getTabTitle, renamingTabId, onStartRename, onConfirmRename, onCancelRename }: TabBarProps) {
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabDragRef = useRef<{ fromId: string; startX: number; overId: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // F013: 重命名输入框 ref，用于自动聚焦
  const renameInputRef = useRef<HTMLInputElement>(null);

  // F013: 当 renamingTabId 变化时自动聚焦输入框
  useEffect(() => {
    if (renamingTabId) {
      setTimeout(() => renameInputRef.current?.select(), 0);
    }
  }, [renamingTabId]);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons);
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      ro.disconnect();
    };
  }, [tabs, updateScrollButtons]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    tabDragRef.current = { fromId: id, startX: e.clientX, overId: null };
    onActivate(id);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!tabDragRef.current) return;
      const { fromId, startX } = tabDragRef.current;
      if (Math.abs(e.clientX - startX) < 4) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const tabEl = el?.closest('[data-tab-id]') as HTMLElement | null;
      const overId = tabEl?.dataset.tabId ?? null;
      if (overId && overId !== fromId) {
        tabDragRef.current.overId = overId;
        setDragOverTabId(overId);
      }
    };
    const onUp = () => {
      if (!tabDragRef.current) return;
      const { fromId, overId } = tabDragRef.current;
      tabDragRef.current = null;
      setDragOverTabId(null);
      if (!overId || overId === fromId) return;
      onReorder(fromId, overId);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onReorder]);

  // F013: 处理重命名输入框的键盘事件
  const handleRenameKeyDown = (e: React.KeyboardEvent, tabId: string, _currentName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) onConfirmRename?.(tabId, value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelRename?.();
    }
  };

  return (
    <div className="shrink-0 flex items-stretch" style={{ minHeight: 30, backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
      <div
        ref={scrollRef}
        className="flex items-end flex-1 overflow-x-auto tabbar-scroll min-w-0"
      >
        {tabs.map(tab => {
          const isRenaming = renamingTabId === tab.id;
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onPointerDown={(e) => !isRenaming && handlePointerDown(e, tab.id)}
              onContextMenu={(e) => { e.preventDefault(); onActivate(tab.id); onContextMenu(e.clientX, e.clientY, tab.id); }}
              style={{
                borderRightColor: 'var(--border-color)',
                backgroundColor: tab.id === activeTabId ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                color: tab.id === activeTabId ? 'var(--text-primary)' : 'var(--text-secondary)',
                ...(tab.id === activeTabId ? { marginBottom: '-1px', borderTop: '2px solid var(--accent-color)' } : {}),
              }}
              className={
                'group relative flex items-center gap-1 pl-3 pr-1.5 py-1 text-xs border-r cursor-grab whitespace-nowrap select-none ' +
                (tab.id === dragOverTabId ? 'border-l-2 border-l-blue-500' : '')
              }
            >
              {isRenaming ? (
                // F013: 重命名输入框（内联替换标题）
                <input
                  ref={renameInputRef}
                  defaultValue={getTabTitle(tab).replace(/ \u25cf$/, '')}
                  onKeyDown={(e) => handleRenameKeyDown(e, tab.id, getTabTitle(tab))}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) onConfirmRename?.(tab.id, value);
                    else onCancelRename?.();
                  }}
                  className="w-full px-1 py-0 text-xs bg-white border border-blue-400 rounded outline-none"
                  style={{ maxWidth: 160 }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className="max-w-45 truncate"
                    title={tab.filePath ?? 'Untitled.md'}
                    onDoubleClick={() => onStartRename?.(tab.id)}
                  >
                    {getTabTitle(tab)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                    className="ml-1 flex items-center justify-center w-4 h-4 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-300 text-slate-400 hover:text-slate-700 transition-opacity"
                    title="关闭"
                  >
                    <X size={11} />
                  </button>
                </>
              )}
            </div>
          );
        })}
        <button
          onClick={onNew}
          title="新建标签页"
          className="flex self-end items-center justify-center w-6 h-6 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0 ml-0.5"
        >
          <Plus size={14} />
        </button>
      </div>
      {(canScrollLeft || canScrollRight) && (
        <div className="flex items-center shrink-0 border-l border-slate-400">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="flex self-end items-center justify-center w-6 h-6 text-slate-500 hover:text-slate-700 hover:bg-slate-300 disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent"
            title="向左滚动"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="flex self-end items-center justify-center w-6 h-6 text-slate-500 hover:text-slate-700 hover:bg-slate-300 disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent border-l border-slate-400"
            title="向右滚动"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
