import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TocSidebar } from '../../components/TocSidebar';
import type { TocEntry } from '../../lib/toc';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

const mockToc: TocEntry[] = [
  { id: 'h1', text: 'Introduction', level: 1, position: 0 },
  { id: 'h2', text: 'Getting Started', level: 2, position: 50 },
  { id: 'h3', text: 'Installation', level: 3, position: 100 },
  { id: 'h2b', text: 'Advanced', level: 2, position: 200 },
];

describe('TocSidebar', () => {
  it('不可见时不渲染', () => {
    const { container } = render(<TocSidebar toc={mockToc} visible={false} />);
    expect(container.children.length).toBe(0);
  });

  it('渲染所有标题条目', () => {
    render(<TocSidebar toc={mockToc} visible={true} />);
    expect(screen.getByText('Introduction')).toBeTruthy();
    expect(screen.getByText('Getting Started')).toBeTruthy();
    expect(screen.getByText('Installation')).toBeTruthy();
    expect(screen.getByText('Advanced')).toBeTruthy();
  });

  it('空目录时显示空状态', () => {
    render(<TocSidebar toc={[]} visible={true} />);
    expect(screen.getByText(/toc\.empty/)).toBeTruthy();
  });

  it('点击标题触发导航回调', () => {
    const onNavigate = vi.fn();
    render(<TocSidebar toc={mockToc} onNavigate={onNavigate} visible={true} />);
    fireEvent.click(screen.getByText('Introduction'));
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1', text: 'Introduction' }));
  });

  it('激活项高亮显示', () => {
    render(<TocSidebar toc={mockToc} activeId="h2" visible={true} />);
    const item = screen.getByText('Getting Started');
    expect(item.closest('button')?.style.color).toContain('accent');
  });

  it('可折叠带子节点的标题', () => {
    render(<TocSidebar toc={mockToc} visible={true} />);
    // Introduction has children (Getting Started, etc.), should have collapse button
    const introItem = screen.getByText('Introduction');
    const button = introItem.closest('div')?.querySelector('button');
    expect(button).toBeTruthy();
  });

  describe('onClose 关闭按钮', () => {
    it('提供 onClose 时渲染关闭按钮', () => {
      const onClose = vi.fn();
      render(<TocSidebar toc={mockToc} visible={true} onClose={onClose} />);
      // 关闭按钮应存在（title="common.close"）
      const closeBtn = screen.getByTitle('common.close');
      expect(closeBtn).toBeTruthy();
    });

    it('点击关闭按钮调用 onClose', () => {
      const onClose = vi.fn();
      render(<TocSidebar toc={mockToc} visible={true} onClose={onClose} />);
      fireEvent.click(screen.getByTitle('common.close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('未提供 onClose 时不渲染关闭按钮', () => {
      render(<TocSidebar toc={mockToc} visible={true} />);
      expect(screen.queryByTitle('common.close')).toBeNull();
    });
  });
});
