import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

import { PreviewContextMenu } from '../../components/PreviewContextMenu';

const defaultProps = {
  visible: true,
  x: 100,
  y: 200,
  hasSelection: false,
  onClose: vi.fn(),
  onAction: vi.fn(),
};

describe('PreviewContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('visible=false 时不渲染', () => {
    const { container } = render(<PreviewContextMenu {...defaultProps} visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('visible=true 时渲染菜单项', () => {
    render(<PreviewContextMenu {...defaultProps} />);
    // Uses translation keys as labels (mock t returns key)
    expect(screen.getByText('ctx.selectAll')).toBeInTheDocument();
    expect(screen.getByText('preview.ctx.viewSource')).toBeInTheDocument();
  });

  it('hasSelection=false 时复制按钮被禁用', () => {
    render(<PreviewContextMenu {...defaultProps} hasSelection={false} />);
    const copyBtn = screen.getByText('preview.ctx.copy').closest('button')!;
    expect(copyBtn).toBeDisabled();
  });

  it('hasSelection=true 时复制按钮可用', () => {
    render(<PreviewContextMenu {...defaultProps} hasSelection={true} />);
    const copyBtn = screen.getByText('preview.ctx.copy').closest('button')!;
    expect(copyBtn).not.toBeDisabled();
  });

  it('点击"全选"触发 onAction("selectAll")', () => {
    const onAction = vi.fn();
    render(<PreviewContextMenu {...defaultProps} onAction={onAction} />);
    fireEvent.click(screen.getByText('ctx.selectAll'));
    expect(onAction).toHaveBeenCalledWith('selectAll');
  });

  it('点击"查看源码"触发 onAction("viewSource")', () => {
    const onAction = vi.fn();
    render(<PreviewContextMenu {...defaultProps} onAction={onAction} />);
    fireEvent.click(screen.getByText('preview.ctx.viewSource'));
    expect(onAction).toHaveBeenCalledWith('viewSource');
  });

  it('有选区时点击复制触发 onAction("copy")', () => {
    const onAction = vi.fn();
    render(<PreviewContextMenu {...defaultProps} hasSelection={true} onAction={onAction} />);
    fireEvent.click(screen.getByText('preview.ctx.copy'));
    expect(onAction).toHaveBeenCalledWith('copy');
  });

  it('有选区时点击"复制为 Markdown"触发 onAction("copyAsMarkdown")', () => {
    const onAction = vi.fn();
    render(<PreviewContextMenu {...defaultProps} hasSelection={true} onAction={onAction} />);
    fireEvent.click(screen.getByText('preview.ctx.copyAsMarkdown'));
    expect(onAction).toHaveBeenCalledWith('copyAsMarkdown');
  });

  it('按 Escape 调用 onClose', () => {
    const onClose = vi.fn();
    render(<PreviewContextMenu {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点击菜单外部调用 onClose', () => {
    const onClose = vi.fn();
    render(<PreviewContextMenu {...defaultProps} onClose={onClose} />);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('不点击菜单内部时不调用 onClose', () => {
    const onClose = vi.fn();
    render(<PreviewContextMenu {...defaultProps} onClose={onClose} />);
    const menu = document.querySelector('.editor-context-menu')!;
    fireEvent.mouseDown(menu);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('菜单位置根据 x/y 设置', () => {
    render(<PreviewContextMenu {...defaultProps} x={150} y={300} />);
    const menu = document.querySelector('.editor-context-menu') as HTMLElement;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('300px');
  });

  it('菜单关闭后重新打开时 visible=false 不渲染', () => {
    const { rerender } = render(<PreviewContextMenu {...defaultProps} visible={true} />);
    expect(document.querySelector('.editor-context-menu')).toBeTruthy();
    rerender(<PreviewContextMenu {...defaultProps} visible={false} />);
    expect(document.querySelector('.editor-context-menu')).toBeFalsy();
  });
});
