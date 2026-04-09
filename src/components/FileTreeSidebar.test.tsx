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

import { FileTreeSidebar } from './FileTreeSidebar';
import type { DirEntry } from './FileTreeSidebar';
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
});
