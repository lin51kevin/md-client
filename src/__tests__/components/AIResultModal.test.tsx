import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIResultModal } from '../../components/AIResultModal';

// Mock clipboard
Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

// Mock useI18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'zh-CN' }),
}));

describe('AIResultModal', () => {
  const baseProps = {
    action: 'polish' as const,
    originalText: 'hello world',
    result: 'Hello World!',
    loading: false,
    onApply: vi.fn(),
    onCopy: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render with correct action title', () => {
    render(<AIResultModal {...baseProps} />);
    expect(screen.getByText(/润色结果/)).toBeDefined();
  });

  it('should display original text and result', () => {
    render(<AIResultModal {...baseProps} />);
    expect(screen.getByText('hello world')).toBeDefined();
    expect(screen.getByText('Hello World!')).toBeDefined();
  });

  it('should call onApply when apply button is clicked', () => {
    render(<AIResultModal {...baseProps} />);
    fireEvent.click(screen.getByText('应用替换'));
    expect(baseProps.onApply).toHaveBeenCalledWith('Hello World!');
  });

  it('should call onCopy when copy button is clicked', () => {
    render(<AIResultModal {...baseProps} />);
    fireEvent.click(screen.getByText('复制结果'));
    expect(baseProps.onCopy).toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', () => {
    render(<AIResultModal {...baseProps} />);
    fireEvent.click(screen.getByText('关闭'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<AIResultModal {...baseProps} loading={true} result="" />);
    expect(screen.getByText('AI 处理中...')).toBeDefined();
  });

  it('should display streaming result incrementally', () => {
    const { rerender } = render(<AIResultModal {...baseProps} loading={true} result="Hello" />);
    expect(screen.getByText('Hello')).toBeDefined();

    rerender(<AIResultModal {...baseProps} loading={true} result="Hello World" />);
    expect(screen.getByText('Hello World')).toBeDefined();
  });
});
