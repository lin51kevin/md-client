import { Pencil } from 'lucide-react';

interface TabContextMenuProps {
  x: number;
  y: number;
  tabId: string;
  onSave: (tabId: string) => void;
  onSaveAs: (tabId: string) => void;
  onClose: (tabId: string) => void;
  /** F013: 重命名 */
  onRename: (tabId: string) => void;
  onDismiss: () => void;
}

export function TabContextMenu({ x, y, tabId, onSave, onSaveAs, onClose, onRename, onDismiss }: TabContextMenuProps) {
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
        {/* F013: 重命名 */}
        <button
          className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-blue-600 hover:text-white text-slate-700"
          onPointerDown={() => { onRename(tabId); onDismiss(); }}
        >
          <Pencil size={13} strokeWidth={1.8} />
          <span>重命名</span>
        </button>
        <div className="my-1 border-t border-slate-200" />
        <button
          className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-blue-600 hover:text-white text-slate-700 gap-6"
          onPointerDown={() => { onClose(tabId); onDismiss(); }}
        >
          <span>关闭</span><span className="text-xs opacity-60">Ctrl+W</span>
        </button>
      </div>
    </>
  );
}
