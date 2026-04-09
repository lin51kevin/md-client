import { Pencil, Pin, PinOff } from 'lucide-react';
import { Tab } from '../types';

interface TabContextMenuProps {
  x: number;
  y: number;
  tabId: string;
  tabs: Tab[];
  onSave: (tabId: string) => void;
  onSaveAs: (tabId: string) => void;
  onClose: (tabId: string) => void;
  /** F013: 重命名 */
  onRename: (tabId: string) => void;
  /** F013: 固定标签 */
  onPin: (tabId: string) => void;
  /** F013: 取消固定 */
  onUnpin: (tabId: string) => void;
  onDismiss: () => void;
}

export function TabContextMenu({ x, y, tabId, tabs, onSave, onSaveAs, onClose, onRename, onPin, onUnpin, onDismiss }: TabContextMenuProps) {
  const tab = tabs.find(t => t.id === tabId);
  const isPinned = tab?.isPinned ?? false;

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onDismiss} />
      <div
        className="fixed z-50 bg-white border border-slate-300 shadow-lg py-1 text-sm"
        style={{ left: x, top: y, minWidth: 180 }}
      >
        <button
          className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-blue-600 hover:text-white text-slate-700 gap-6"
          onPointerDown={() => { onSave(tabId); onDismiss(); }}
        >
          <span>保存</span><span className="text-xs opacity-60">Ctrl+S</span>
        </button>
        <button
          className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-blue-600 hover:text-white text-slate-700 gap-6"
          onPointerDown={() => { onSaveAs(tabId); onDismiss(); }}
        >
          <span>另存为…</span><span className="text-xs opacity-60">Ctrl+Shift+S</span>
        </button>
        <div className="my-1 border-t border-slate-200" />
        {/* F013: 固定 / 取消固定 */}
        {isPinned ? (
          <button
            className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-blue-600 hover:text-white text-slate-700"
            onPointerDown={() => { onUnpin(tabId); onDismiss(); }}
          >
            <PinOff size={13} strokeWidth={1.8} />
            <span>取消固定</span>
          </button>
        ) : (
          <button
            className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-blue-600 hover:text-white text-slate-700"
            onPointerDown={() => { onPin(tabId); onDismiss(); }}
          >
            <Pin size={13} strokeWidth={1.8} />
            <span>固定标签</span>
          </button>
        )}
        {/* F013: 重命名 */}
        <button
          className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-blue-600 hover:text-white text-slate-700"
          onPointerDown={() => { onRename(tabId); onDismiss(); }}
        >
          <Pencil size={13} strokeWidth={1.8} />
          <span>重命名</span>
        </button>
        <div className="my-1 border-t border-slate-200" />
        {/* F013: 固定标签不可关闭（按钮禁用） */}
        <button
          className={`w-full flex items-center justify-between px-4 py-1.5 gap-6 ${isPinned ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white text-slate-700'}`}
          onPointerDown={() => { if (!isPinned) { onClose(tabId); onDismiss(); } }}
        >
          <span>关闭</span><span className="text-xs opacity-60">Ctrl+W</span>
        </button>
      </div>
    </>
  );
}
