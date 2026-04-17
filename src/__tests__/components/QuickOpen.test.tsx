import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { QuickOpen } from '../../components/QuickOpen';
import type { DirEntry } from '../../components/FileTreeSidebar';
const { invoke } = await import('@tauri-apps/api/core');
const mockedInvoke = vi.mocked(invoke);

const MOCK_TREE: DirEntry = {
  name: 'root',
  path: '/project',
  is_dir: true,
  is_file: false,
  extension: null,
  children: [
    {
      name: 'docs',
      path: '/project/docs',
      is_dir: true,
      is_file: false,
      extension: null,
      children: [
        { name: 'guide.md', path: '/project/docs/guide.md', is_dir: false, is_file: true, extension: 'md', children: null },
        { name: 'api.md', path: '/project/docs/api.md', is_dir: false, is_file: true, extension: 'md', children: null },
      ],
    },
    { name: 'README.md', path: '/project/README.md', is_dir: false, is_file: true, extension: 'md', children: null },
    { name: 'notes.txt', path: '/project/notes.txt', is_dir: false, is_file: true, extension: 'txt', children: null },
  ],
};

const defaultProps = {
  visible: true,
  onClose: vi.fn(),
  onFileOpen: vi.fn(),
  fileTreeRoot: '/project',
  recentFiles: [],
  locale: 'zh-CN',
};

describe('QuickOpen', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedInvoke.mockResolvedValue(MOCK_TREE);
  });

  it('visible=false 时不渲染', () => {
    const { container } = render(<QuickOpen {...defaultProps} visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('visible=true 时渲染搜索框', () => {
    render(<QuickOpen {...defaultProps} />);
    expect(screen.getByPlaceholderText('输入文件名搜索...')).toBeInTheDocument();
  });

  it('打开时调用 read_dir_recursive', async () => {
    render(<QuickOpen {...defaultProps} />);
    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith('read_dir_recursive', {
        path: '/project',
        depth: 6,
      });
    });
  });

  it('加载完成后显示文件列表', async () => {
    render(<QuickOpen {...defaultProps} />);
    await waitFor(() => {
      // README.md appears twice (label + path span), use getAllByText
      expect(screen.getAllByText('README.md').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('无 fileTreeRoot 时显示提示', () => {
    render(<QuickOpen {...defaultProps} fileTreeRoot="" />);
    expect(screen.getByText('请先打开一个文件夹')).toBeInTheDocument();
  });

  it('根据输入过滤文件名', async () => {
    render(<QuickOpen {...defaultProps} />);
    await waitFor(() => screen.getAllByText('README.md'));

    fireEvent.change(screen.getByPlaceholderText('输入文件名搜索...'), {
      target: { value: 'guide' },
    });

    await waitFor(() => {
      // guide.md appears in label
      const labels = document.querySelectorAll('.command-item-label');
      const texts = Array.from(labels).map(el => el.textContent);
      expect(texts).toContain('guide.md');
      expect(texts).not.toContain('README.md');
    });
  });

  it('无匹配时显示空状态', async () => {
    render(<QuickOpen {...defaultProps} />);
    await waitFor(() => screen.getAllByText('README.md'));

    fireEvent.change(screen.getByPlaceholderText('输入文件名搜索...'), {
      target: { value: 'zzz不存在' },
    });

    await waitFor(() => {
      expect(screen.getByText('未找到匹配文件')).toBeInTheDocument();
    });
  });

  it('按 Escape 调用 onClose', async () => {
    const onClose = vi.fn();
    render(<QuickOpen {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getAllByText('README.md'));

    fireEvent.keyDown(screen.getByPlaceholderText('输入文件名搜索...'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点击遮罩层调用 onClose', async () => {
    const onClose = vi.fn();
    render(<QuickOpen {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getAllByText('README.md'));

    const overlay = document.querySelector('.command-palette-overlay')!;
    fireEvent.mouseDown(overlay, { target: overlay });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点击文件调用 onFileOpen 并关闭', async () => {
    const onFileOpen = vi.fn();
    const onClose = vi.fn();
    render(<QuickOpen {...defaultProps} onFileOpen={onFileOpen} onClose={onClose} />);
    await waitFor(() => screen.getAllByText('README.md'));

    // Click the option that has README.md in its label span
    const options = document.querySelectorAll('[role="option"]');
    const readmeOption = Array.from(options).find(el =>
      el.querySelector('.command-item-label')?.textContent === 'README.md'
    )!;
    fireEvent.click(readmeOption);
    expect(onFileOpen).toHaveBeenCalledWith('/project/README.md');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('按 Enter 打开选中文件', async () => {
    const onFileOpen = vi.fn();
    render(<QuickOpen {...defaultProps} onFileOpen={onFileOpen} />);
    await waitFor(() => screen.getAllByText('README.md'));

    fireEvent.keyDown(screen.getByPlaceholderText('输入文件名搜索...'), { key: 'Enter' });
    expect(onFileOpen).toHaveBeenCalledTimes(1);
  });

  it('ArrowDown/Up 键切换选中项', async () => {
    render(<QuickOpen {...defaultProps} />);
    await waitFor(() => screen.getAllByText('README.md'));

    const input = screen.getByPlaceholderText('输入文件名搜索...');
    const optionsBefore = document.querySelectorAll('[role="option"]');
    expect(optionsBefore.length).toBeGreaterThan(1);

    // ArrowDown → selectedIndex 1
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const selected = document.querySelector('[data-selected="true"]');
    expect(selected).toBeTruthy();

    // ArrowUp → back to 0
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const firstSelected = document.querySelector('[data-selected="true"]');
    expect(firstSelected).toBeTruthy();
  });

  it('最近文件显示在顶部分组中', async () => {
    const recentFiles = [{ path: '/project/README.md', name: 'README.md', openedAt: new Date().toISOString() }];
    render(<QuickOpen {...defaultProps} recentFiles={recentFiles} />);
    await waitFor(() => screen.getAllByText('README.md'));

    // Should show "最近打开" group header
    expect(screen.getByText('最近打开')).toBeInTheDocument();
  });

  it('英文 locale 显示英文占位符', () => {
    render(<QuickOpen {...defaultProps} locale="en" />);
    expect(screen.getByPlaceholderText('Search files by name...')).toBeInTheDocument();
  });

  it('invoke 失败时显示空列表', async () => {
    mockedInvoke.mockRejectedValue(new Error('FS error'));
    render(<QuickOpen {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('未找到匹配文件')).toBeInTheDocument();
    });
  });

  it('显示文件相对路径', async () => {
    render(<QuickOpen {...defaultProps} />);
    await waitFor(() => screen.getByText('guide.md'));
    // The relative path for guide.md should be shown
    expect(screen.getByText('docs/guide.md')).toBeInTheDocument();
  });
});
