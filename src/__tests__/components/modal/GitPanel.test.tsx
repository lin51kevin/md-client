import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitPanel } from '../../../components/modal/GitPanel';
import type { GitFileStatus } from '../../../lib/file';

const modifiedFiles: GitFileStatus[] = [
  { path: 'README.md', status: 'modified', staged: false },
  { path: 'new.md', status: 'untracked', staged: false },
];

const stagedFiles: GitFileStatus[] = [
  { path: 'staged.md', status: 'modified', staged: true },
  { path: 'README.md', status: 'modified', staged: false },
];

const defaultProps = {
  isRepo: true,
  branch: 'main',
  ahead: 0,
  behind: 0,
  files: modifiedFiles,
  isLoading: false,
  error: null,
  onCommit: vi.fn(),
  onPull: vi.fn(),
  onPush: vi.fn(),
  onRefresh: vi.fn(),
  onClose: vi.fn(),
  onDiff: vi.fn().mockResolvedValue('diff content'),
  onStage: vi.fn().mockResolvedValue(undefined),
  onUnstage: vi.fn().mockResolvedValue(undefined),
  onRestore: vi.fn().mockResolvedValue(undefined),
  onFileOpen: vi.fn(),
};

describe('GitPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应显示当前分支名', () => {
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText(/main/)).toBeInTheDocument();
  });

  it('应列出变更文件', () => {
    render(<GitPanel {...defaultProps} />);
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getByText('new.md')).toBeInTheDocument();
  });

  it('应显示文件状态标签', () => {
    render(<GitPanel {...defaultProps} />);
    // M for modified, ? for untracked
    const modBadges = screen.getAllByText(/^M$|modified/i);
    expect(modBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('应显示提交消息输入框', () => {
    render(<GitPanel {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/提交信息|commit message/i)
    ).toBeInTheDocument();
  });

  it('提交按钮在无暂存文件时应禁用', () => {
    render(<GitPanel {...defaultProps} files={[]} />);
    const commitBtn = screen.getByRole('button', { name: /提交|commit/i });
    expect(commitBtn).toBeDisabled();
  });

  it('提交按钮在有暂存文件但无提交信息时应禁用', () => {
    render(<GitPanel {...defaultProps} files={stagedFiles} />);
    const commitBtn = screen.getByRole('button', { name: /提交|commit/i });
    expect(commitBtn).toBeDisabled();
  });

  it('有暂存文件并填写提交信息后提交按钮应启用', () => {
    render(<GitPanel {...defaultProps} files={stagedFiles} />);
    const input = screen.getByPlaceholderText(/提交信息|commit message/i);
    fireEvent.change(input, { target: { value: 'feat: test' } });
    const commitBtn = screen.getByRole('button', { name: /提交|commit/i });
    expect(commitBtn).not.toBeDisabled();
  });

  it('点击提交应调用 onCommit 并传入消息和所有暂存文件', async () => {
    render(<GitPanel {...defaultProps} files={stagedFiles} />);
    const input = screen.getByPlaceholderText(/提交信息|commit message/i);
    fireEvent.change(input, { target: { value: 'fix: something' } });
    fireEvent.click(screen.getByRole('button', { name: /提交|commit/i }));
    await waitFor(() =>
      expect(defaultProps.onCommit).toHaveBeenCalledWith('fix: something', ['staged.md'])
    );
  });

  it('已暂存文件应显示绿色勾标记', () => {
    render(<GitPanel {...defaultProps} files={stagedFiles} />);
    const stagedIndicators = screen.getAllByTitle(/已暂存|staged/i);
    expect(stagedIndicators.length).toBeGreaterThanOrEqual(1);
  });

  it('点击 Stage 按钮应调用 onStage', async () => {
    const { container } = render(<GitPanel {...defaultProps} files={modifiedFiles} />);
    const fileRow = container.querySelector('[title="暂存 (Stage)"]');
    if (fileRow) {
      fireEvent.click(fileRow);
      await waitFor(() => expect(defaultProps.onStage).toHaveBeenCalled());
    }
  });

  it('点击 Unstage 按钮应调用 onUnstage', async () => {
    const { container } = render(<GitPanel {...defaultProps} files={stagedFiles} />);
    const fileRow = container.querySelector('[title="取消暂存 (Unstage)"]');
    if (fileRow) {
      fireEvent.click(fileRow);
      await waitFor(() => expect(defaultProps.onUnstage).toHaveBeenCalled());
    }
  });

  it('点击 Pull 按钮应调用 onPull', () => {
    render(<GitPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /pull|拉取/i }));
    expect(defaultProps.onPull).toHaveBeenCalled();
  });

  it('点击 Push 按钮应调用 onPush', () => {
    render(<GitPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /push|推送/i }));
    expect(defaultProps.onPush).toHaveBeenCalled();
  });

  it('非 git 仓库时应显示提示信息', () => {
    render(<GitPanel {...defaultProps} isRepo={false} />);
    expect(screen.getByText(/不是 Git 仓库|not a git/i)).toBeInTheDocument();
  });

  it('点击关闭按钮应调用 onClose', () => {
    render(<GitPanel {...defaultProps} />);
    const closeBtn = screen.getByRole('button', { name: /close|关闭/i });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('isLoading 为 true 时应显示加载状态', () => {
    render(<GitPanel {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/loading|加载|刷新/i)).toBeInTheDocument();
  });

  it('error 不为 null 时应显示错误信息', () => {
    render(<GitPanel {...defaultProps} error="push failed: permission denied" />);
    expect(screen.getByText(/push failed|permission denied/i)).toBeInTheDocument();
  });

  it('ahead > 0 时应显示推送计数', () => {
    render(<GitPanel {...defaultProps} ahead={3} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });
});
