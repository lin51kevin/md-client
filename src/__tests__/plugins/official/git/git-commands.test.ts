import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  gitGetRepo,
  gitGetStatus,
  gitDiff,
  gitCommit,
  gitPull,
  gitPush,
  gitStage,
  gitUnstage,
  gitRestore,
} from '../../../../plugins/official/git/src/git-commands';

const mockInvoke = vi.mocked(invoke);

describe('git-commands (plugin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gitGetRepo', () => {
    it('应返回仓库信息', async () => {
      mockInvoke.mockResolvedValueOnce({
        path: '/repo',
        branch: 'main',
        ahead: 2,
        behind: 0,
      });
      const result = await gitGetRepo('/repo');
      expect(result).not.toBeNull();
      expect(result?.branch).toBe('main');
      expect(result?.ahead).toBe(2);
      expect(mockInvoke).toHaveBeenCalledWith('git_get_repo', { path: '/repo' });
    });

    it('非 git 仓库应返回 null（不抛出异常）', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('not a git repository'));
      const result = await gitGetRepo('/not-a-repo');
      expect(result).toBeNull();
    });
  });

  describe('gitGetStatus', () => {
    it('应返回文件状态列表', async () => {
      mockInvoke.mockResolvedValueOnce([
        { path: 'README.md', status: 'modified' },
        { path: 'new.md', status: 'untracked' },
      ]);
      const result = await gitGetStatus('/repo');
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('README.md');
      expect(result[0].status).toBe('modified');
      expect(mockInvoke).toHaveBeenCalledWith('git_get_status', { path: '/repo' });
    });

    it('无变更时应返回空数组', async () => {
      mockInvoke.mockResolvedValueOnce([]);
      const result = await gitGetStatus('/repo');
      expect(result).toHaveLength(0);
    });

    it('调用失败应抛出错误', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Git error'));
      await expect(gitGetStatus('/repo')).rejects.toThrow('Git error');
    });
  });

  describe('gitDiff', () => {
    it('应返回 diff 字符串', async () => {
      const diffStr = '@@ -1,3 +1,4 @@\n context\n+new line\n-old line';
      mockInvoke.mockResolvedValueOnce(diffStr);
      const result = await gitDiff('/repo', 'README.md');
      expect(result).toBe(diffStr);
      expect(mockInvoke).toHaveBeenCalledWith('git_diff', {
        path: '/repo',
        filePath: 'README.md',
      });
    });
  });

  describe('gitCommit', () => {
    it('成功提交时应正常 resolve', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await expect(
        gitCommit('/repo', 'feat: add feature', ['README.md'])
      ).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('git_commit', {
        path: '/repo',
        message: 'feat: add feature',
        files: ['README.md'],
      });
    });

    it('提交消息为空时应抛出错误（前端验证）', async () => {
      await expect(gitCommit('/repo', '', ['f.md'])).rejects.toThrow(/message/i);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('无文件时应抛出错误（前端验证）', async () => {
      await expect(gitCommit('/repo', 'msg', [])).rejects.toThrow(/file/i);
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('gitPull', () => {
    it('成功拉取时应正常 resolve', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await expect(gitPull('/repo')).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('git_pull', { path: '/repo' });
    });

    it('失败时应透传错误信息', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Authentication failed'));
      await expect(gitPull('/repo')).rejects.toThrow('Authentication failed');
    });
  });

  describe('gitPush', () => {
    it('成功推送时应正常 resolve', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await expect(gitPush('/repo')).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('git_push', { path: '/repo' });
    });

    it('远端未配置时应抛出错误', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('No remote configured'));
      await expect(gitPush('/repo')).rejects.toThrow('No remote configured');
    });
  });

  describe('gitStage', () => {
    it('应调用 git_stage 并传入文件列表', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await expect(gitStage('/repo', ['file1.md', 'file2.md'])).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('git_stage', {
        path: '/repo',
        files: ['file1.md', 'file2.md'],
      });
    });
  });

  describe('gitUnstage', () => {
    it('应调用 git_unstage 并传入文件列表', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await expect(gitUnstage('/repo', ['file1.md'])).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('git_unstage', {
        path: '/repo',
        files: ['file1.md'],
      });
    });
  });

  describe('gitRestore', () => {
    it('应调用 git_restore 并传入文件路径', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await expect(gitRestore('/repo', 'file.md')).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('git_restore', {
        path: '/repo',
        filePath: 'file.md',
      });
    });
  });
});
