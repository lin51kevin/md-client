import { Tab } from '../types';
import { useI18n } from '../i18n';

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
  /** 关闭所有非固定标签页 */
  onCloseAll?: () => void;
}

export function TabContextMenu({ x, y, tabId, tabs, onSave, onSaveAs, onClose, onRename, onPin, onUnpin, onDismiss, onCloseAll }: TabContextMenuProps) {
  const { t } = useI18n();
  const tab = tabs.find(t => t.id === tabId);
  const isPinned = tab?.isPinned ?? false;

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onDismiss} />
      <div
        className="fixed z-50 shadow-lg py-1 text-sm"
        style={{ left: x, top: y, minWidth: 180, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
      >
        <button
          className="w-full flex items-center justify-between px-4 py-1.5 gap-6"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.color = 'var(--bg-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onPointerDown={() => { onSave(tabId); onDismiss(); }}
        >
          <span>{t('tabCtx.save')}</span><span className="text-xs opacity-60">Ctrl+S</span>
        </button>
        <button
          className="w-full flex items-center justify-between px-4 py-1.5 gap-6"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.color = 'var(--bg-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onPointerDown={() => { onSaveAs(tabId); onDismiss(); }}
        >
          <span>{t('tabCtx.saveAs')}</span><span className="text-xs opacity-60">Ctrl+Shift+S</span>
        </button>
        <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
        {/* F013: 固定 / 取消固定 */}
        {isPinned ? (
          <button
            className="w-full flex items-center gap-2 px-4 py-1.5"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-color)';
              e.currentTarget.style.color = 'var(--bg-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onPointerDown={() => { onUnpin(tabId); onDismiss(); }}
          >
<span>{t('tabCtx.unpin')}</span>
          </button>
        ) : (
          <button
            className="w-full flex items-center gap-2 px-4 py-1.5"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-color)';
              e.currentTarget.style.color = 'var(--bg-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onPointerDown={() => { onPin(tabId); onDismiss(); }}
          >
<span>{t('tabCtx.pin')}</span>
          </button>
        )}
        {/* F013: 重命名 */}
        <button
          className="w-full flex items-center gap-2 px-4 py-1.5"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.color = 'var(--bg-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onPointerDown={() => { onRename(tabId); onDismiss(); }}
        >
<span>{t('tabCtx.rename')}</span>
        </button>
        <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
        {/* F013: 固定标签不可关闭（按钮禁用） */}
        <button
          className={`w-full flex items-center justify-between px-4 py-1.5 gap-6 ${isPinned ? 'cursor-not-allowed opacity-30' : ''}`}
          style={isPinned ? undefined : { color: 'var(--text-primary)' }}
          onMouseEnter={(e) => {
            if (!isPinned) {
              e.currentTarget.style.backgroundColor = 'var(--accent-color)';
              e.currentTarget.style.color = 'var(--bg-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isPinned) {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onPointerDown={() => { if (!isPinned) { onClose(tabId); onDismiss(); } }}
        >
          <span>{t('tabCtx.close')}</span><span className="text-xs opacity-60">Ctrl+W</span>
        </button>
        <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
        <button
          className="w-full flex items-center gap-2 px-4 py-1.5"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.color = 'var(--bg-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onPointerDown={() => { onCloseAll?.(); onDismiss(); }}
        >
<span>{t('tab.closeAll')}</span>
        </button>
      </div>
    </>
  );
}
