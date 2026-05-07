import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorContextMenu } from '../../../components/editor/EditorContextMenu';
import type { ContextInfo } from '../../../lib/editor';

vi.mock('../../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

describe('EditorContextMenu', () => {
  const baseContext: ContextInfo = {
    type: 'normal',
    lineStart: 0,
    lineText: 'test',
    headingLevel: 0,
  };

  const defaultProps = {
    visible: true,
    x: 100,
    y: 200,
    context: baseContext,
    hasSelection: false,
    isMarkdown: true,
    onClose: vi.fn(),
    onAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('不可见时不渲染', () => {
    const { container } = render(<EditorContextMenu {...defaultProps} visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('可见时渲染菜单', () => {
    render(<EditorContextMenu {...defaultProps} />);
    expect(screen.getByText('ctx.copy')).toBeTruthy();
  });

  it('点击菜单项触发 onAction', () => {
    const onAction = vi.fn();
    render(<EditorContextMenu {...defaultProps} onAction={onAction} />);
    fireEvent.click(screen.getByText('ctx.copy'));
    expect(onAction).toHaveBeenCalledWith('copy');
  });

  it('显示剪切选项', () => {
    render(<EditorContextMenu {...defaultProps} />);
    expect(screen.getByText('ctx.cut')).toBeTruthy();
  });

  it('在表格中显示表格相关操作', () => {
    const tableContext: ContextInfo = { type: 'table', lineStart: 0, lineText: '| a |', headingLevel: 0 };
    render(<EditorContextMenu {...defaultProps} context={tableContext} />);
    expect(screen.getByText('ctx.tableInsertRow')).toBeTruthy();
  });

  it('非 Markdown 文件不显示格式化菜单项', () => {
    render(<EditorContextMenu {...defaultProps} isMarkdown={false} />);
    expect(screen.getByText('ctx.cut')).toBeTruthy();
    expect(screen.getByText('ctx.copy')).toBeTruthy();
    expect(screen.getByText('snippet.insert')).toBeTruthy();
    expect(screen.queryByText('ctx.bold')).toBeNull();
    expect(screen.queryByText('ctx.italic')).toBeNull();
    expect(screen.queryByText('ctx.link')).toBeNull();
    expect(screen.queryByText('ctx.image')).toBeNull();
  });

  it('非 Markdown 文件表格上下文不显示表格操作', () => {
    const tableContext: ContextInfo = { type: 'table', lineStart: 0, lineText: '| a |', headingLevel: 0 };
    render(<EditorContextMenu {...defaultProps} isMarkdown={false} context={tableContext} />);
    expect(screen.queryByText('ctx.tableInsertRow')).toBeNull();
    expect(screen.queryByText('ctx.editTable')).toBeNull();
  });
});
