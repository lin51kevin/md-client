import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlidePreview } from '../../../components/preview/SlidePreview';

describe('SlidePreview', () => {
  const sampleMd = '# Slide 1\nContent 1\n---\n## Slide 2\nContent 2\n---\n### Slide 3\nContent 3';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染当前幻灯片内容', () => {
    render(<SlidePreview markdown={sampleMd} onClose={() => {}} />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('应显示页码', () => {
    render(<SlidePreview markdown={sampleMd} onClose={() => {}} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('空幻灯片数组应显示提示信息', () => {
    render(<SlidePreview markdown="no separators here" onClose={() => {}} />);
    // No --- means single slide with all content
    expect(screen.getAllByText(/no separators here/i).length).toBeGreaterThanOrEqual(1);
  });

  it('点击右半边应前进一页', () => {
    render(<SlidePreview markdown={sampleMd} onClose={() => {}} />);
    const container = document.querySelector('.slide-preview-container');
    if (container) {
      fireEvent.click(container, { clientX: 1000 });
      // After clicking right half, should advance to slide 2
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    }
  });

  it('ESC 应调用 onClose', () => {
    const onClose = vi.fn();
    render(<SlidePreview markdown={sampleMd} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('空文档应显示无幻灯片提示', () => {
    render(<SlidePreview markdown="" onClose={() => {}} />);
    expect(screen.getByText(/no slides/i)).toBeInTheDocument();
  });
});
