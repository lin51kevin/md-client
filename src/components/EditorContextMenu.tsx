import { useEffect, useRef } from 'react';
import {
  Scissors, Copy, Clipboard, MousePointerClick,
  Bold, Italic, Strikethrough, Code, Link2, Image,
  Heading1, ArrowDownToLine, ArrowUpFromLine,
  Plus, Minus, AlignLeft, AlignCenter, AlignRight,
  IndentIncrease, IndentDecrease, ListOrdered,
  Quote, Sigma, Pencil
} from 'lucide-react';
import type { ContextInfo } from '../lib/context-menu';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/zh-CN';

interface EditorContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  context: ContextInfo;
  onClose: () => void;
  onAction: (action: string) => void;
}

/** Menu item definition */
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  divider?: boolean; // insert separator before this item
}

/** Build menu items based on context type */
function buildMenuItems(context: ContextInfo, t: (key: TranslationKey) => string): MenuItem[] {
  const base: MenuItem[] = [
    { id: 'cut', label: t('ctx.cut'), icon: <Scissors size={14} strokeWidth={1.8} /> },
    { id: 'copy', label: t('ctx.copy'), icon: <Copy size={14} strokeWidth={1.8} /> },
    { id: 'paste', label: t('ctx.paste'), icon: <Clipboard size={14} strokeWidth={1.8} /> },
    { id: 'selectAll', label: t('ctx.selectAll'), icon: <MousePointerClick size={14} strokeWidth={1.8} />, divider: true },
  ];

  const contextual: MenuItem[] = [];

  switch (context.type) {
    case 'normal':
      contextual.push(
        { id: 'bold', label: t('ctx.bold'), icon: <Bold size={14} strokeWidth={2} /> },
        { id: 'italic', label: t('ctx.italic'), icon: <Italic size={14} strokeWidth={2} /> },
        { id: 'strikethrough', label: t('ctx.strikethrough'), icon: <Strikethrough size={14} strokeWidth={2} /> },
        { id: 'code', label: t('ctx.code'), icon: <Code size={14} strokeWidth={2} />, divider: true },
        { id: 'link', label: t('ctx.link'), icon: <Link2 size={14} strokeWidth={2} /> },
        { id: 'image', label: t('ctx.image'), icon: <Image size={14} strokeWidth={2} /> },
      );
      break;

    case 'heading':
      contextual.push(
        { id: 'headingPromote', label: t('ctx.headingPromote'), icon: <ArrowUpFromLine size={14} strokeWidth={1.8} /> },
        { id: 'headingDemote', label: context.headingLevel <= 1 ? t('ctx.headingRemove') : t('ctx.headingDemote'), icon: context.headingLevel <= 1 ? <Minus size={14} strokeWidth={1.8} /> : <ArrowDownToLine size={14} strokeWidth={1.8} /> },
        { id: 'headingRemove', label: t('ctx.headingRemoveFormat'), icon: <Heading1 size={14} strokeWidth={1.8} />, divider: true },
        { id: 'bold', label: t('ctx.bold'), icon: <Bold size={14} strokeWidth={2} /> },
        { id: 'italic', label: t('ctx.italic'), icon: <Italic size={14} strokeWidth={2} /> },
      );
      break;

    case 'code':
      contextual.push(
        { id: 'copyCodeBlock', label: t('ctx.copyCodeBlock'), icon: <Copy size={14} strokeWidth={1.8} /> },
      );
      break;

    case 'table':
      contextual.push(
        { id: 'editTable', label: t('ctx.editTable'), icon: <Pencil size={14} strokeWidth={1.8} />, divider: true },
        { id: 'tableInsertRow', label: t('ctx.tableInsertRow'), icon: <Plus size={14} strokeWidth={1.8} /> },
        { id: 'tableDeleteRow', label: t('ctx.tableDeleteRow'), icon: <Minus size={14} strokeWidth={1.8} /> },
        { id: 'tableInsertCol', label: t('ctx.tableInsertCol'), icon: <Plus size={14} strokeWidth={1.8} /> },
        { id: 'tableDeleteCol', label: t('ctx.tableDeleteCol'), icon: <Minus size={14} strokeWidth={1.8} />, divider: true },
        { id: 'alignLeft', label: t('ctx.alignLeft'), icon: <AlignLeft size={14} strokeWidth={1.8} /> },
        { id: 'alignCenter', label: t('ctx.alignCenter'), icon: <AlignCenter size={14} strokeWidth={1.8} /> },
        { id: 'alignRight', label: t('ctx.alignRight'), icon: <AlignRight size={14} strokeWidth={1.8} /> },
      );
      break;

    case 'listItem':
      contextual.push(
        { id: 'indent', label: t('ctx.indent'), icon: <IndentIncrease size={14} strokeWidth={1.8} /> },
        { id: 'outdent', label: t('ctx.outdent'), icon: <IndentDecrease size={14} strokeWidth={1.8} />, divider: true },
        { id: 'toggleListType', label: t('ctx.toggleListType'), icon: <ListOrdered size={14} strokeWidth={1.8} /> },
      );
      break;

    case 'blockquote':
      contextual.push(
        { id: 'removeBlockquote', label: t('ctx.removeBlockquote'), icon: <Quote size={14} strokeWidth={2} /> },
      );
      break;

    case 'math':
      contextual.push(
        { id: 'copyFormula', label: t('ctx.copyFormula'), icon: <Sigma size={14} strokeWidth={1.8} /> },
      );
      break;
  }

  return [...base, ...contextual];
}

export function EditorContextMenu({ visible, x, y, context, onClose, onAction }: EditorContextMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside or Escape to close
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

  const items = buildMenuItems(context, t);

  // Clamp position to viewport
  const menuWidth = 180;
  const menuHeight = Math.min(items.length * 34 + 16, 400); // estimate
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
            className="ctx-menu-item"
            onClick={() => onAction(item.id)}
            onMouseDown={(e) => e.preventDefault()} // prevent blur before click
          >
            <span className="ctx-menu-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
