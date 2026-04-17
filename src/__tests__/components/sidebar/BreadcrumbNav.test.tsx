import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BreadcrumbNav } from '../../../components/sidebar/BreadcrumbNav';

const defaultProps = {
  filePath: '/project/docs/guide.md',
  fileTreeRoot: '/project',
  onNavigateFolder: vi.fn(),
  locale: 'zh-CN',
};

describe('BreadcrumbNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filePath=null 时显示"未保存文件"', () => {
    render(<BreadcrumbNav {...defaultProps} filePath={null} />);
    expect(screen.getByText('未保存文件')).toBeInTheDocument();
  });

  it('显示文件名', () => {
    render(<BreadcrumbNav {...defaultProps} />);
    expect(screen.getByText('guide.md')).toBeInTheDocument();
  });

  it('显示根目录名', () => {
    render(<BreadcrumbNav {...defaultProps} />);
    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('显示中间文件夹', () => {
    render(<BreadcrumbNav {...defaultProps} />);
    expect(screen.getByText('docs')).toBeInTheDocument();
  });

  it('文件夹是可点击按钮', () => {
    render(<BreadcrumbNav {...defaultProps} />);
    const docsBtn = screen.getByRole('button', { name: /docs/i });
    expect(docsBtn).toBeInTheDocument();
  });

  it('文件名不是按钮（只读显示）', () => {
    render(<BreadcrumbNav {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map(b => b.textContent);
    expect(labels.some(l => l?.includes('guide.md'))).toBe(false);
  });

  it('点击文件夹触发 onNavigateFolder', () => {
    const onNavigateFolder = vi.fn();
    render(<BreadcrumbNav {...defaultProps} onNavigateFolder={onNavigateFolder} />);
    const docsBtn = screen.getByRole('button', { name: /docs/i });
    fireEvent.click(docsBtn);
    expect(onNavigateFolder).toHaveBeenCalledTimes(1);
    expect(onNavigateFolder).toHaveBeenCalledWith(expect.stringContaining('docs'));
  });

  it('点击根目录触发 onNavigateFolder', () => {
    const onNavigateFolder = vi.fn();
    render(<BreadcrumbNav {...defaultProps} onNavigateFolder={onNavigateFolder} />);
    const rootBtn = screen.getByRole('button', { name: /project/i });
    fireEvent.click(rootBtn);
    expect(onNavigateFolder).toHaveBeenCalledWith('/project');
  });

  it('文件在根目录下时不显示中间文件夹', () => {
    render(<BreadcrumbNav {...defaultProps} filePath="/project/README.md" />);
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.queryByText('docs')).not.toBeInTheDocument();
  });

  it('英文 locale 显示英文未保存提示', () => {
    render(<BreadcrumbNav {...defaultProps} filePath={null} locale="en" />);
    expect(screen.getByText('Unsaved file')).toBeInTheDocument();
  });

  it('无 fileTreeRoot 时显示完整路径分段', () => {
    render(<BreadcrumbNav {...defaultProps} fileTreeRoot="" />);
    expect(screen.getByText('guide.md')).toBeInTheDocument();
  });

  it('反斜杠路径也正确解析（Windows 路径）', () => {
    render(
      <BreadcrumbNav
        filePath="C:\\project\\docs\\guide.md"
        fileTreeRoot="C:\\project"
        onNavigateFolder={vi.fn()}
        locale="zh-CN"
      />
    );
    expect(screen.getByText('guide.md')).toBeInTheDocument();
    expect(screen.getByText('docs')).toBeInTheDocument();
  });

  it('渲染 nav landmark', () => {
    render(<BreadcrumbNav {...defaultProps} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('分隔符图标存在于多级路径中', () => {
    render(<BreadcrumbNav {...defaultProps} />);
    // There should be at least 2 crumbs → at least 1 separator (ChevronRight)
    const segments = document.querySelectorAll('.breadcrumb-segment');
    expect(segments.length).toBeGreaterThan(1);
  });
});
