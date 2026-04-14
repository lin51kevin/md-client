/**
 * F014 — FileTreeSidebar 单元测试
 *
 * 基础渲染、可见性、数据展示、文件点击回调、错误处理测试。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock dialog plugin (for pickFolder)
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

import { FileTreeSidebar } from '../../components/FileTreeSidebar';
import type { DirEntry } from '../../components/FileTreeSidebar';
const { invoke } = await import('@tauri-apps/api/core');
const mockedInvoke = vi.mocked(invoke);

/** 测试用示例数据 */
const MOCK_ENTRIES: DirEntry[] = [
  { name: 'docs', path: './docs', is_dir: true, is_file: false, extension: null, children: [] },
  { name: 'notes', path: './notes', is_dir: true, is_file: false, extension: null, children: [
    { name: 'todo.md', path: './notes/todo.md', is_dir: false, is_file: true, extension: 'md' },
    { name: 'ideas.txt', path: './notes/ideas.txt', is_dir: false, is_file: true, extension: 'txt' },
  ]},
  { name: 'README.md', path: './README.md', is_dir: false, is_file: true, extension: 'md' },
];

describe('FileTreeSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认：read_dir_recursive 返回根目录数据
    mockedInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'read_dir_recursive') {
        return Promise.resolve({
          name: '.', path: '.', is_dir: true, is_file: false,
          extension: null, children: MOCK_ENTRIES,
        });
      }
      return Promise.resolve([]);
    });
  });

  it('renders when visible=true', async () => {
    render(<FileTreeSidebar visible={true} />);
    await waitFor(() => {
      expect(screen.getByText('文件')).toBeTruthy();
    });
  });

  it('does not render when visible=false', () => {
    const { container } = render(<FileTreeSidebar visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows loading state initially', async () => {
    // 让 invoke 挂起以观察 loading
    mockedInvoke.mockReturnValue(new Promise(() => {})); // never resolves
    render(<FileTreeSidebar visible={true} />);
    // 应该有 spinner（Loader2 → animate-spin class）
    expect(document.querySelector('.animate-spin') || document.querySelector('[class*="spinner"]') || document.querySelector('[class*="loading"]')).toBeTruthy();
  });

  it('shows directory entries after load', async () => {
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => {
      expect(screen.getByText('docs')).toBeTruthy();
      expect(screen.getByText('notes')).toBeTruthy();
      expect(screen.getByText('README.md')).toBeTruthy();
    });
  });

  it('calls onFileOpen when clicking a file', async () => {
    const handleOpen = vi.fn();
    render(
      <FileTreeSidebar visible={true} onFileOpen={handleOpen} activeFilePath={null} />
    );
    await waitFor(() => screen.getByText('README.md'));
    fireEvent.click(screen.getByText('README.md'));
    expect(handleOpen).toHaveBeenCalledWith('./README.md');
  });

  it('handles error state gracefully', async () => {
    mockedInvoke.mockRejectedValue(new Error('Permission denied'));
    render(<FileTreeSidebar visible={true} />);
    // 错误状态应该渲染出某些内容（不崩溃）
    await waitFor(() => {
      const html = document.body.innerHTML;
      // 要么显示错误信息，要么至少没有崩溃（有内容）
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('搜索过滤', () => {
    it('渲染搜索输入框', async () => {
      render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
      await waitFor(() => screen.getByText('README.md'));
      const searchInput = screen.getByPlaceholderText('搜索文件...');
      expect(searchInput).toBeTruthy();
      expect((searchInput as HTMLInputElement).type).toBe('text');
    });

    it('输入关键词后过滤文件列表', async () => {
      render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
      await waitFor(() => screen.getByText('README.md'));

      const searchInput = screen.getByPlaceholderText('搜索文件...');
      fireEvent.change(searchInput, { target: { value: 'todo' } });

      // 应该只显示匹配的文件
      expect(screen.queryByText('docs')).toBeFalsy();
      expect(screen.queryByText('notes')).toBeTruthy();
      expect(screen.queryByText('todo.md')).toBeTruthy();
      expect(screen.queryByText('ideas.txt')).toBeFalsy();
      expect(screen.queryByText('README.md')).toBeFalsy();
    });

    it('清空搜索框恢复全部文件', async () => {
      render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
      await waitFor(() => screen.getByText('README.md'));

      const searchInput = screen.getByPlaceholderText('搜索文件...');
      fireEvent.change(searchInput, { target: { value: 'todo' } });
      expect(screen.queryByText('README.md')).toBeFalsy();

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('docs')).toBeTruthy();
      expect(screen.getByText('notes')).toBeTruthy();
      expect(screen.getByText('README.md')).toBeTruthy();
    });

    it('无匹配结果时不崩溃', async () => {
      render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
      await waitFor(() => screen.getByText('README.md'));

      const searchInput = screen.getByPlaceholderText('搜索文件...');
      fireEvent.change(searchInput, { target: { value: 'zzz_no_match' } });
      // 不应崩溃，可以没有条目或显示空状态提示
      expect(document.body.innerHTML.length).toBeGreaterThan(0);
    });
  });
});

// ==================== CRUD 功能测试 ====================

describe('FileTreeSidebar CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'read_dir_recursive') {
        return Promise.resolve({
          name: '.', path: '.', is_dir: true, is_file: false,
          extension: null, children: MOCK_ENTRIES,
        });
      }
      return Promise.resolve([]);
    });
  });

  it('工具栏有新建文件按钮', async () => {
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('README.md'));
    const buttons = document.querySelectorAll('.file-tree-tool-btn');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('点击新建文件调用 create_file 命令', async () => {
    mockedInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'read_dir_recursive') {
        return Promise.resolve({ name: '.', path: '.', is_dir: true, is_file: false, extension: null, children: MOCK_ENTRIES });
      }
      return Promise.resolve(undefined);
    });
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('README.md'));

    const buttons = document.querySelectorAll('.file-tree-tool-btn');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith(
        'create_file',
        expect.objectContaining({ path: expect.stringContaining('untitled-') })
      );
    }, { timeout: 3000 });
  });

  it('右键点击文件显示上下文菜单', async () => {
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('README.md'));

    fireEvent.contextMenu(screen.getByText('README.md'));
    await waitFor(() => {
      expect(screen.getByText('重命名')).toBeTruthy();
      expect(screen.getByText('删除')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('点击删除按钮调用 delete_file 命令', async () => {
    mockedInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'read_dir_recursive') {
        return Promise.resolve({ name: '.', path: '.', is_dir: true, is_file: false, extension: null, children: MOCK_ENTRIES });
      }
      return Promise.resolve(undefined);
    });
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('README.md'));

    fireEvent.contextMenu(screen.getByText('README.md'));
    await waitFor(() => screen.getByText('删除'));
    fireEvent.click(screen.getByText('删除'));

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith(
        'delete_file',
        expect.objectContaining({ path: './README.md' })
      );
    }, { timeout: 2000 });
  });

  it('点击重命名进入内联编辑模式', async () => {
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('README.md'));

    fireEvent.contextMenu(screen.getByText('README.md'))
    await waitFor(() => screen.getByText('重命名'))
    fireEvent.click(screen.getByText('重命名'))

    await waitFor(() => {
      const input = document.querySelector('nav input') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      expect(input?.value).toBe('README');
    }, { timeout: 2000 });
  });

  it('重命名按 Enter 确认调用 rename_file', async () => {
    mockedInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'read_dir_recursive') {
        return Promise.resolve({ name: '.', path: '.', is_dir: true, is_file: false, extension: null, children: MOCK_ENTRIES });
      }
      return Promise.resolve(undefined);
    });
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('README.md'));

    fireEvent.contextMenu(screen.getByText('README.md'))
    await waitFor(() => screen.getByText('重命名'))
    fireEvent.click(screen.getByText('重命名'))

    const input = await waitFor(() => document.querySelector('nav input') as HTMLInputElement)
    fireEvent.change(input, { target: { value: 'new-name' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith(
        'rename_file',
        expect.objectContaining({
          oldPath: './README.md',
          newPath: expect.stringContaining('new-name.md'),
        })
      );
    }, { timeout: 2000 });
  });

  it('右键目录不显示上下文菜单', async () => {
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('docs'));

    fireEvent.contextMenu(screen.getByText('docs'));
    await new Promise((r) => setTimeout(r, 500));
    expect(screen.queryByText('重命名')).toBeFalsy();
  });

  it('点击空白处关闭上下文菜单', async () => {
    render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} activeFilePath={null} />);
    await waitFor(() => screen.getByText('README.md'));

    fireEvent.contextMenu(screen.getByText('README.md'))
    await waitFor(() => screen.getByText('重命名'))

    const nav = document.querySelector('nav')!
    fireEvent.click(nav)

    await waitFor(() => {
      expect(screen.queryByText('重命名')).toBeFalsy()
    }, { timeout: 1000 })
  });

  describe('onClose 关闭按钮', () => {
    it('提供 onClose 时在工具栏渲染关闭按钮', async () => {
      const onClose = vi.fn();
      render(<FileTreeSidebar visible={true} onClose={onClose} onFileOpen={vi.fn()} />);
      await waitFor(() => screen.getByText('文件'));
      const closeBtn = screen.getByTitle('关闭');
      expect(closeBtn).toBeTruthy();
    });

    it('点击关闭按钮调用 onClose', async () => {
      const onClose = vi.fn();
      render(<FileTreeSidebar visible={true} onClose={onClose} onFileOpen={vi.fn()} />);
      await waitFor(() => screen.getByText('文件'));
      fireEvent.click(screen.getByTitle('关闭'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('未提供 onClose 时不渲染关闭按钮', async () => {
      render(<FileTreeSidebar visible={true} onFileOpen={vi.fn()} />);
      await waitFor(() => screen.getByText('文件'));
      expect(screen.queryByTitle('关闭')).toBeNull();
    });
  });
});
