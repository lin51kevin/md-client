/**
 * ToolbarButton — 工具栏通用按钮组件
 *
 * 封装三种变体的悬浮/激活样式，消除 Toolbar.tsx 中大量重复的 onMouseEnter/onMouseLeave 逻辑。
 *
 * 变体：
 *   toggle  — 带激活状态（强调色），用于 TOC、拼写检查、焦点模式等切换按钮
 *   view    — 带激活状态（带边框/背景），用于编辑/分栏/预览模式切换
 *   action  — 无激活状态，用于新建、打开、保存、格式化等操作按钮
 */
import React from 'react';

type Variant = 'toggle' | 'view' | 'action';

interface ToolbarButtonProps {
  onClick?: () => void;
  title?: string;
  /** 是否激活（toggle/view 变体有效） */
  active?: boolean;
  /** 按钮变体，默认 'action' */
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const BASE =
  'flex items-center justify-center gap-1.5 px-2 py-1 text-xs rounded border transition-all';

/**
 * 根据变体和激活状态返回 inline style（避免 Tailwind purge 问题）
 */
function getStyle(variant: Variant, active: boolean): React.CSSProperties {
  if (variant === 'toggle') {
    return active
      ? {
          backgroundColor: 'var(--accent-bg)',
          borderColor: 'var(--accent-color)',
          color: 'var(--accent-color)',
        }
      : {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          color: 'var(--text-secondary)',
        };
  }
  if (variant === 'view') {
    return active
      ? {
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
          color: 'var(--accent-color)',
        }
      : {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          color: 'var(--text-secondary)',
        };
  }
  // action
  return {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: 'var(--text-secondary)',
  };
}

export function ToolbarButton({
  onClick,
  title,
  active = false,
  variant = 'action',
  children,
  className,
  disabled,
}: ToolbarButtonProps) {
  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (active) return;
    const el = e.currentTarget;
    if (variant === 'view') {
      el.style.backgroundColor = 'var(--bg-primary)';
      el.style.borderColor = 'var(--border-color)';
      el.style.color = 'var(--text-primary)';
    } else {
      el.style.backgroundColor = 'var(--hover-bg)';
      el.style.color = 'var(--text-primary)';
    }
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (active) return;
    const el = e.currentTarget;
    const base = getStyle(variant, false);
    el.style.backgroundColor = base.backgroundColor as string;
    el.style.borderColor = base.borderColor as string;
    el.style.color = base.color as string;
  };

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${BASE} ${className ?? ''}`}
      style={getStyle(variant, active)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
    </button>
  );
}
