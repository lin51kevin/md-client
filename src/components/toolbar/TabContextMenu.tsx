import { Tab } from '../../types';
import { useI18n } from '../../i18n';

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
  /** 在文件管理器中显示 */
  onReveal?: (tabId: string) => void;
  /** 关闭其他标签页 */
  onCloseOthers?: (tabId: string) => void;
  /** 关闭左侧标签页 */
  onCloseLeft?: (tabId: string) => void;
  /** 关闭右侧标签页 */
  onCloseRight?: (tabId: string) => void;
  /** 设置标签颜色 */
  onSetColor?: (tabId: string, color: string | undefined) => void;
}

const TAB_COLORS = [
  { id: 'red', color: '#ef4444', name: '红色' },
  { id: 'orange', color: '#f97316', name: '橙色' },
  { id: 'yellow', color: '#eab308', name: '黄色' },
  { id: 'green', color: '#22c55e', name: '绿色' },
  { id: 'blue', color: '#3b82f6', name: '蓝色' },
];

export function TabContextMenu({ x, y, tabId, tabs, onSave, onSaveAs, onClose, onRename, onPin, onUnpin, onDismiss, onCloseAll, onReveal, onCloseOthers, onCloseLeft, onCloseRight, onSetColor }: TabContextMenuProps) {
  const { t } = useI18n();
  const tab = tabs.find(t => t.id === tabId);
  const isPinned = tab?.isPinned ?? false;
  const hasFilePath = !!tab?.filePath;

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
        {/* 颜色标记 */}
        {onSetColor && (
          <div className="px-4 py-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {TAB_COLORS.map(c => (
                <button
                  key={c.id}
                  className="w-4 h-4 rounded-full border border-transparent hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: c.color, border: tab?.color === c.color ? '2px solid var(--text-primary)' : undefined }}
                  onClick={() => { onSetColor(tabId, c.color); onDismiss(); }}
                  title={c.name}
                />
              ))}
              <button
                className="w-4 h-4 rounded-full text-xs flex items-center justify-center hover:bg-gray-200 transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                onClick={() => { onSetColor(tabId, undefined); onDismiss(); }}
                title={t('tabCtx.clearColor')}
              >✕</button>
            </div>
          </div>
        )}
        <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
        {/* Reveal in File Explorer */}
        {hasFilePath && onReveal && (
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
            onPointerDown={() => { onReveal(tabId); onDismiss(); }}
          >
            <span>{t('tabCtx.reveal')}</span><span className="text-xs opacity-60">Ctrl+Shift+E</span>
          </button>
        )}
        {/* Copy full file path to clipboard */}
        {hasFilePath && (
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
            onPointerDown={async () => {
              try {
                await navigator.clipboard.writeText(tab?.filePath ?? '');
              } catch (err) {
                console.error('Copy to clipboard failed', err);
              }
              onDismiss();
            }}
          >
            <span>{t('tabCtx.copyFullPath')}</span>
          </button>
        )}
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
        {/* Close Others / Left / Right */}
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
          onPointerDown={() => { onCloseOthers?.(tabId); onDismiss(); }}
        >
          <span>{t('tabCtx.closeOthers')}</span>
        </button>
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
          onPointerDown={() => { onCloseLeft?.(tabId); onDismiss(); }}
        >
          <span>{t('tabCtx.closeLeft')}</span>
        </button>
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
          onPointerDown={() => { onCloseRight?.(tabId); onDismiss(); }}
        >
          <span>{t('tabCtx.closeRight')}</span>
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
