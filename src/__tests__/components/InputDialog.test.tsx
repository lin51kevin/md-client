import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputDialog } from '../../components/InputDialog';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

describe('InputDialog', () => {
  const defaultProps = {
    visible: true,
    title: 'Enter URL',
    description: 'Please enter a URL:',
    placeholder: 'https://...',
    defaultValue: '',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('不可见时不渲染', () => {
    const { container } = render(<InputDialog {...defaultProps} visible={false} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('可见时渲染标题和消息', () => {
    render(<InputDialog {...defaultProps} />);
    expect(screen.getByText('Enter URL')).toBeTruthy();
    expect(screen.getByText('Please enter a URL:')).toBeTruthy();
  });

  it('输入框显示默认值', () => {
    render(<InputDialog {...defaultProps} defaultValue="https://example.com" />);
    const input = screen.getByPlaceholderText('https://...');
    expect((input as HTMLInputElement).value).toBe('https://example.com');
  });

  it('Enter 键触发确认', () => {
    const onConfirm = vi.fn();
    render(<InputDialog {...defaultProps} onConfirm={onConfirm} defaultValue="test" />);
    const input = screen.getByPlaceholderText('https://...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith('test');
  });

  it('Escape 键触发取消', () => {
    const onCancel = vi.fn();
    render(<InputDialog {...defaultProps} onCancel={onCancel} />);
    const input = screen.getByPlaceholderText('https://...');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('点击背景层触发取消', () => {
    const onCancel = vi.fn();
    render(<InputDialog {...defaultProps} onCancel={onCancel} />);
    // The overlay is the parent of role="dialog"
    const dialog = screen.getByRole('dialog');
    const overlay = dialog.parentElement!;
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalled();
  });
});
