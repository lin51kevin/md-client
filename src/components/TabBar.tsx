import { useRef, useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
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
}

export function TabBar({ tabs, activeTabId, onActivate, onClose, onNew, onReorder, onContextMenu, getTabTitle }: TabBarProps) {
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const tabDragRef = useRef<{ fromId: string; startX: number; overId: string | null } | null>(null);

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

  return (
    <div
      className="shrink-0 flex items-end bg-slate-200 border-b border-slate-400 overflow-x-auto"
      style={{ minHeight: 30 }}
    >
      {tabs.map(tab => (
        <div
          key={tab.id}
          data-tab-id={tab.id}
          onPointerDown={(e) => handlePointerDown(e, tab.id)}
          onContextMenu={(e) => { e.preventDefault(); onActivate(tab.id); onContextMenu(e.clientX, e.clientY, tab.id); }}
          className={
            'group relative flex items-center gap-1 pl-3 pr-1.5 py-1 text-xs border-r border-slate-400 cursor-grab whitespace-nowrap select-none ' +
            (tab.id === activeTabId
              ? 'bg-white text-slate-800 -mb-px border-t border-t-blue-500 '
              : 'bg-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 ') +
            (tab.id === dragOverTabId ? 'border-l-2 border-l-blue-500' : '')
          }
        >
          <span className="max-w-45 truncate" title={tab.filePath ?? 'Untitled.md'}>
            {getTabTitle(tab)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
            className="ml-1 flex items-center justify-center w-4 h-4 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-300 text-slate-400 hover:text-slate-700 transition-opacity"
            title="关闭"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={onNew}
        title="新建标签页"
        className="flex items-center justify-center w-7 h-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0 self-center ml-0.5"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
