/**
 * WelcomePage 单元测试
 *
 * 测试欢迎页渲染、最近文件列表、快速操作按钮、快捷键速览。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { WelcomePage } from '../../components/WelcomePage';
import type { RecentFile } from '../../lib/recent-files';

const MOCK_RECENT_FILES: RecentFile[] = [
  { path: '/docs/notes.md', name: 'notes.md', openedAt: '2026-04-10T10:00:00Z' },
  { path: '/docs/readme.md', name: 'readme.md', openedAt: '2026-04-09T08:00:00Z' },
  { path: '/workspace/todo.md', name: 'todo.md', openedAt: '2026-04-08T12:00:00Z' },
];

describe('WelcomePage', () => {
  const onNew = vi.fn();
  const onOpenFile = vi.fn();
  const onOpenRecent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome title and subtitle', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    // Should show app name or welcome text
    expect(screen.getByText('MarkLite')).toBeTruthy();
  });

  it('renders recent files list', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    expect(screen.getByText('notes.md')).toBeTruthy();
    expect(screen.getByText('readme.md')).toBeTruthy();
    expect(screen.getByText('todo.md')).toBeTruthy();
  });

  it('shows empty state when no recent files', () => {
    render(
      <WelcomePage
        recentFiles={[]}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    expect(screen.queryByText('notes.md')).toBeNull();
    expect(screen.getByText('暂无最近打开的文件')).toBeTruthy();
  });

  it('calls onOpenRecent when clicking a recent file', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    fireEvent.click(screen.getByText('notes.md'));
    expect(onOpenRecent).toHaveBeenCalledWith('/docs/notes.md');
  });

  it('calls onNew when clicking new button', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    // Use getAllByText and pick the first one (button) since "新建" also appears in shortcuts label
    const newBtns = screen.getAllByText('新建');
    fireEvent.click(newBtns[0]);
    expect(onNew).toHaveBeenCalledOnce();
  });

  it('calls onOpenFile when clicking open button', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    const openBtns = screen.getAllByText('打开文件');
    fireEvent.click(openBtns[0]);
    expect(onOpenFile).toHaveBeenCalledOnce();
  });

  it('renders keyboard shortcuts section', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    expect(screen.getByText('Ctrl+N')).toBeTruthy();
    expect(screen.getByText('Ctrl+O')).toBeTruthy();
    expect(screen.getByText('Ctrl+S')).toBeTruthy();
  });
});
