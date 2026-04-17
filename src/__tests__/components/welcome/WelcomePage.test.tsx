/**
 * WelcomePage + EmptyEditorState unit tests
 *
 * Tests welcome page rendering, recent files list, quick-action links,
 * keyboard shortcuts panel, dismiss behaviour, and the empty-editor overlay.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { WelcomePage, EmptyEditorState } from '../../../components/welcome/WelcomePage';
import type { RecentFile } from '../../../lib/file';

const MOCK_RECENT_FILES: RecentFile[] = [
  { path: '/docs/notes.md', name: 'notes.md', openedAt: '2026-04-10T10:00:00Z' },
  { path: '/docs/readme.md', name: 'readme.md', openedAt: '2026-04-09T08:00:00Z' },
  { path: '/workspace/todo.md', name: 'todo.md', openedAt: '2026-04-08T12:00:00Z' },
];

describe('WelcomePage', () => {
  const onNew = vi.fn();
  const onOpenFile = vi.fn();
  const onOpenRecent = vi.fn();
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app title', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
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

  it('calls onNew when clicking the new-file action', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    fireEvent.click(screen.getByText('新建'));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it('calls onOpenFile when clicking the open-file action', () => {
    render(
      <WelcomePage
        recentFiles={MOCK_RECENT_FILES}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    // "打开文件" appears in start section; pick the first match
    fireEvent.click(screen.getAllByText('打开文件')[0]);
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

  it('renders dismiss button when onDismiss is provided', () => {
    render(
      <WelcomePage
        recentFiles={[]}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
        onDismiss={onDismiss}
      />
    );
    // The dismiss button has title="关闭欢迎页"
    const btn = screen.getByTitle('关闭欢迎页');
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not render dismiss button when onDismiss is omitted', () => {
    render(
      <WelcomePage
        recentFiles={[]}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
      />
    );
    expect(screen.queryByTitle('关闭欢迎页')).toBeNull();
  });
});

describe('EmptyEditorState', () => {
  it('renders keyboard shortcut hints', () => {
    render(<EmptyEditorState />);
    expect(screen.getByText('Ctrl+N')).toBeTruthy();
    expect(screen.getByText('Ctrl+O')).toBeTruthy();
    expect(screen.getByText('Ctrl+S')).toBeTruthy();
  });

  it('renders show-welcome link when onShowWelcome is provided', () => {
    const onShowWelcome = vi.fn();
    render(<EmptyEditorState onShowWelcome={onShowWelcome} />);
    const link = screen.getByText('重新显示欢迎页');
    fireEvent.click(link);
    expect(onShowWelcome).toHaveBeenCalledOnce();
  });

  it('does not render show-welcome link when omitted', () => {
    render(<EmptyEditorState />);
    expect(screen.queryByText('重新显示欢迎页')).toBeNull();
  });
});
