/**
 * ToolbarMenu — 通用的工具栏下拉菜单
 *
 * 用于把一组低频操作收纳进单个按钮，减少工具栏常驻图标数量。
 * 点击触发按钮展开菜单，点击菜单外部或选中某项后自动关闭。
 */
import { useRef, useState, useEffect, type ReactNode } from 'react';
import { ToolbarButton } from './ToolbarButton';

export interface ToolbarMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** 切换类项目的激活态（在菜单中以强调色高亮） */
  active?: boolean;
  disabled?: boolean;
}

interface ToolbarMenuProps {
  /** 触发按钮的图标 */
  icon: ReactNode;
  /** 触发按钮的 tooltip / 无障碍标签 */
  title: string;
  items: ToolbarMenuItem[];
  /** 菜单相对触发按钮的水平对齐，默认左对齐 */
  align?: 'left' | 'right';
}

export function ToolbarMenu({ icon, title, items, align = 'left' }: ToolbarMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <ToolbarButton onClick={() => setOpen((v) => !v)} title={title} variant="toggle" active={open}>
        {icon}
      </ToolbarButton>
      {open && (
        <div
          className={`absolute top-full mt-1 z-50 py-1 rounded border shadow-lg min-w-40 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              disabled={item.disabled}
              className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-default"
              style={{ color: item.active ? 'var(--accent-color)' : 'var(--text-primary)' }}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              <span className="shrink-0 flex items-center w-4 justify-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
