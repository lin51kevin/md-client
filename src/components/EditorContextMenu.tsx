import { useEffect, useRef } from 'react';
import {
  Scissors, Copy, Clipboard, MousePointerClick,
  Bold, Italic, Strikethrough, Code, Link2, Image,
  Heading1, ArrowDownToLine, ArrowUpFromLine,
  Plus, Minus, AlignLeft, AlignCenter, AlignRight,
  IndentIncrease, IndentDecrease, ListOrdered,
  Quote, Sigma
} from 'lucide-react';
import type { ContextInfo } from '../lib/context-menu';

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
function buildMenuItems(context: ContextInfo): MenuItem[] {
  const base: MenuItem[] = [
    { id: 'cut', label: '剪切', icon: <Scissors size={14} strokeWidth={1.8} /> },
    { id: 'copy', label: '复制', icon: <Copy size={14} strokeWidth={1.8} /> },
    { id: 'paste', label: '粘贴', icon: <Clipboard size={14} strokeWidth={1.8} /> },
    { id: 'selectAll', label: '全选', icon: <MousePointerClick size={14} strokeWidth={1.8} />, divider: true },
  ];

  const contextual: MenuItem[] = [];

  switch (context.type) {
    case 'normal':
      contextual.push(
        { id: 'bold', label: '加粗', icon: <Bold size={14} strokeWidth={2} /> },
        { id: 'italic', label: '斜体', icon: <Italic size={14} strokeWidth={2} /> },
        { id: 'strikethrough', label: '删除线', icon: <Strikethrough size={14} strokeWidth={2} /> },
        { id: 'code', label: '行内代码', icon: <Code size={14} strokeWidth={2} />, divider: true },
        { id: 'link', label: '插入链接', icon: <Link2 size={14} strokeWidth={2} /> },
        { id: 'image', label: '插入图片', icon: <Image size={14} strokeWidth={2} /> },
      );
      break;

    case 'heading':
      contextual.push(
        { id: 'headingPromote', label: '升级标题', icon: <ArrowUpFromLine size={14} strokeWidth={1.8} /> },
        { id: 'headingDemote', label: context.headingLevel <= 1 ? '移除标题' : '降级标题', icon: context.headingLevel <= 1 ? <Minus size={14} strokeWidth={1.8} /> : <ArrowDownToLine size={14} strokeWidth={1.8} /> },
        { id: 'headingRemove', label: '移除标题格式', icon: <Heading1 size={14} strokeWidth={1.8} />, divider: true },
        { id: 'bold', label: '加粗', icon: <Bold size={14} strokeWidth={2} /> },
        { id: 'italic', label: '斜体', icon: <Italic size={14} strokeWidth={2} /> },
      );
      break;

    case 'code':
      contextual.push(
        { id: 'copyCodeBlock', label: '复制代码块', icon: <Copy size={14} strokeWidth={1.8} /> },
      );
      break;

    case 'table':
      contextual.push(
        { id: 'tableInsertRow', label: '插入行', icon: <Plus size={14} strokeWidth={1.8} /> },
        { id: 'tableDeleteRow', label: '删除行', icon: <Minus size={14} strokeWidth={1.8} /> },
        { id: 'tableInsertCol', label: '插入列', icon: <Plus size={14} strokeWidth={1.8} /> },
        { id: 'tableDeleteCol', label: '删除列', icon: <Minus size={14} strokeWidth={1.8} />, divider: true },
        { id: 'alignLeft', label: '左对齐', icon: <AlignLeft size={14} strokeWidth={1.8} /> },
        { id: 'alignCenter', label: '居中对齐', icon: <AlignCenter size={14} strokeWidth={1.8} /> },
        { id: 'alignRight', label: '右对齐', icon: <AlignRight size={14} strokeWidth={1.8} /> },
      );
      break;

    case 'listItem':
      contextual.push(
        { id: 'indent', label: '缩进', icon: <IndentIncrease size={14} strokeWidth={1.8} /> },
        { id: 'outdent', label: '反缩进', icon: <IndentDecrease size={14} strokeWidth={1.8} />, divider: true },
        { id: 'toggleListType', label: '切换列表类型', icon: <ListOrdered size={14} strokeWidth={1.8} /> },
      );
      break;

    case 'blockquote':
      contextual.push(
        { id: 'removeBlockquote', label: '移除引用', icon: <Quote size={14} strokeWidth={2} /> },
      );
      break;

    case 'math':
      contextual.push(
        { id: 'copyFormula', label: '复制公式', icon: <Sigma size={14} strokeWidth={1.8} /> },
      );
      break;
  }

  return [...base, ...contextual];
}

export function EditorContextMenu({ visible, x, y, context, onClose, onAction }: EditorContextMenuProps) {
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

  const items = buildMenuItems(context);

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
