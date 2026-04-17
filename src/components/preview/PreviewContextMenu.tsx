/**
 * Preview Context Menu
 *
 * Right-click context menu for the preview pane (both MarkdownPreview and MilkdownPreview).
 * Provides copy, select-all, and view-source actions appropriate for the preview context.
 */
import { useEffect, useRef } from 'react';
import { Copy, MousePointerClick, ExternalLink, FileCode } from 'lucide-react';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/zh-CN';

interface PreviewContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  divider?: boolean;
  disabled?: boolean;
}

function buildMenuItems(
  hasSelection: boolean,
  t: (key: TranslationKey) => string,
): MenuItem[] {
  const items: MenuItem[] = [];

  items.push({
    id: 'copy',
    label: t('preview.ctx.copy'),
    icon: <Copy size={14} strokeWidth={1.8} />,
    disabled: !hasSelection,
  });

  items.push({
    id: 'copyAsMarkdown',
    label: t('preview.ctx.copyAsMarkdown'),
    icon: <FileCode size={14} strokeWidth={1.8} />,
    disabled: !hasSelection,
  });

  items.push({
    id: 'selectAll',
    label: t('ctx.selectAll'),
    icon: <MousePointerClick size={14} strokeWidth={1.8} />,
    divider: true,
  });

  items.push({
    id: 'viewSource',
    label: t('preview.ctx.viewSource'),
    icon: <ExternalLink size={14} strokeWidth={1.8} />,
    divider: true,
  });

  return items;
}

export function PreviewContextMenu({ visible, x, y, hasSelection, onClose, onAction }: PreviewContextMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const items = buildMenuItems(hasSelection, t);

  const menuWidth = 200;
  const menuHeight = Math.min(items.length * 34 + 16, 400);
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 4);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 4);

  return (
    <div
      ref={menuRef}
      className="editor-context-menu"
      style={{ left: clampedX, top: clampedY }}
    >
      {items.map((item, idx) => (
        <div key={item.id}>
          {item.divider && idx > 0 && <div className="ctx-menu-separator" />}
          <button
            className={`ctx-menu-item${item.disabled ? ' ctx-menu-item-disabled' : ''}`}
            onClick={() => {
              if (!item.disabled) onAction(item.id);
            }}
            onMouseDown={e => e.preventDefault()}
            disabled={item.disabled}
          >
            <span className="ctx-menu-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
