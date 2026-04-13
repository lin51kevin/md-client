import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../lib/git-commands', () => ({
  gitGetRepo: vi.fn(),
  gitGetStatus: vi.fn(),
  gitDiff: vi.fn(),
  gitCommit: vi.fn(),
  gitPull: vi.fn(),
  gitPush: vi.fn(),
  gitStage: vi.fn(),
  gitUnstage: vi.fn(),
  gitRestore: vi.fn(),
}));

import {
  gitGetRepo,
  gitGetStatus,
  gitCommit,
  gitPull,
  gitPush,
  gitStage,
  gitUnstage,
  gitRestore,
} from '../../lib/git-commands';
import { useGit } from '../../hooks/useGit';

const mockGetRepo = vi.mocked(gitGetRepo);
const mockGetStatus = vi.mocked(gitGetStatus);
const mockCommit = vi.mocked(gitCommit);
const mockPull = vi.mocked(gitPull);
const mockPush = vi.mocked(gitPush);
const mockStage = vi.mocked(gitStage);
const mockUnstage = vi.mocked(gitUnstage);
const mockRestore = vi.mocked(gitRestore);

describe('useGit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('repoPath 为 null 时 isRepo 应为 false，不发起请求', () => {
    const { result } = renderHook(() => useGit(null));
    expect(result.current.isRepo).toBe(false);
    expect(result.current.branch).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(mockGetRepo).not.toHaveBeenCalled();
  });

  it('有效 repoPath 应检测 git 仓库并填充状态', async () => {
    mockGetRepo.mockResolvedValueOnce({
      path: '/repo',
      branch: 'main',
      ahead: 1,
      behind: 0,
    });
    mockGetStatus.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGit('/repo'));

    await waitFor(() => expect(result.current.isRepo).toBe(true));
    expect(result.current.branch).toBe('main');
    expect(result.current.ahead).toBe(1);
    expect(result.current.behind).toBe(0);
  });

  it('非 git 仓库应使 isRepo 为 false', async () => {
    mockGetRepo.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useGit('/not-a-repo'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isRepo).toBe(false);
  });

  it('files 应包含仓库中的变更文件', async () => {
    mockGetRepo.mockResolvedValueOnce({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValueOnce([
      { path: 'a.md', status: 'modified' },
      { path: 'b.md', status: 'added' },
    ]);

    const { result } = renderHook(() => useGit('/repo'));

    await waitFor(() => expect(result.current.files).toHaveLength(2));
    expect(result.current.files[0].path).toBe('a.md');
    expect(result.current.files[1].status).toBe('added');
  });

  it('commit 应调用 gitCommit 并刷新状态', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([{ path: 'a.md', status: 'modified' }]);
    mockCommit.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => {
      await result.current.commit('fix: test', ['a.md']);
    });

    expect(mockCommit).toHaveBeenCalledWith('/repo', 'fix: test', ['a.md']);
    // status should be refreshed after commit
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  it('pull 应调用 gitPull 并刷新状态', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([]);
    mockPull.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => { await result.current.pull(); });
    expect(mockPull).toHaveBeenCalledWith('/repo');
  });

  it('push 应调用 gitPush', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 1,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([]);
    mockPush.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => { await result.current.push(); });
    expect(mockPush).toHaveBeenCalledWith('/repo');
  });

  it('stage 应调用 gitStage 并刷新状态', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([{ path: 'a.md', status: 'modified', staged: false }]);
    mockStage.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => { await result.current.stage(['a.md']); });
    expect(mockStage).toHaveBeenCalledWith('/repo', ['a.md']);
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  it('unstage 应调用 gitUnstage 并刷新状态', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([{ path: 'a.md', status: 'modified', staged: true }]);
    mockUnstage.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => { await result.current.unstage(['a.md']); });
    expect(mockUnstage).toHaveBeenCalledWith('/repo', ['a.md']);
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  it('restore 应调用 gitRestore 并刷新状态', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([{ path: 'a.md', status: 'modified', staged: false }]);
    mockRestore.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => { await result.current.restore('a.md'); });
    expect(mockRestore).toHaveBeenCalledWith('/repo', 'a.md');
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  it('git 操作出错时应设置 error 状态', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([]);
    mockCommit.mockRejectedValueOnce(new Error('commit failed'));

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => {
      await result.current.commit('msg', ['a.md']);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('refresh 应重新获取状态', async () => {
    mockGetRepo.mockResolvedValue({
      path: '/repo',
      branch: 'main',
      ahead: 0,
      behind: 0,
    });
    mockGetStatus.mockResolvedValue([]);

    const { result } = renderHook(() => useGit('/repo'));
    await waitFor(() => expect(result.current.isRepo).toBe(true));

    await act(async () => { result.current.refresh(); });
    // Should call status again
    expect(mockGetStatus.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
