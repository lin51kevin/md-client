import { useState, useEffect, useCallback } from 'react';
import { toErrorMessage } from '../lib/utils/errors';
import {
  gitGetRepo,
  gitGetStatus,
  gitCommit,
  gitPull,
  gitPush,
  gitDiff,
  gitStage,
  gitUnstage,
  gitRestore,
  type GitFileStatus,
  type GitRepo,
} from '../lib/git-commands';

export interface GitState {
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  isLoading: boolean;
  error: string | null;
}

export interface UseGitReturn extends GitState {
  refresh: () => void;
  commit: (message: string, files: string[]) => Promise<void>;
  pull: () => Promise<void>;
  push: () => Promise<void>;
  getDiff: (filePath: string) => Promise<string>;
  stage: (files: string[]) => Promise<void>;
  unstage: (files: string[]) => Promise<void>;
  restore: (filePath: string) => Promise<void>;
}

export function useGit(repoPath: string | null): UseGitReturn {
  const [repo, setRepo] = useState<GitRepo | null>(null);
  const [files, setFiles] = useState<GitFileStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const repoInfo = await gitGetRepo(path);
      setRepo(repoInfo);
      if (repoInfo) {
        const statusList = await gitGetStatus(path);
        setFiles(statusList);
      } else {
        setFiles([]);
      }
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!repoPath) {
      setRepo(null);
      setFiles([]);
      return;
    }
    loadStatus(repoPath);
  }, [repoPath, loadStatus]);

  const refresh = useCallback(() => {
    if (repoPath) loadStatus(repoPath);
  }, [repoPath, loadStatus]);

  const commit = useCallback(
    async (message: string, selectedFiles: string[]) => {
      if (!repoPath) return;
      try {
        setError(null);
        await gitCommit(repoPath, message, selectedFiles);
        await loadStatus(repoPath);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [repoPath, loadStatus]
  );

  const pull = useCallback(async () => {
    if (!repoPath) return;
    try {
      setError(null);
      await gitPull(repoPath);
      await loadStatus(repoPath);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [repoPath, loadStatus]);

  const push = useCallback(async () => {
    if (!repoPath) return;
    try {
      setError(null);
      await gitPush(repoPath);
      await loadStatus(repoPath);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [repoPath, loadStatus]);

  const getDiff = useCallback(
    async (filePath: string): Promise<string> => {
      if (!repoPath) return '';
      return gitDiff(repoPath, filePath);
    },
    [repoPath]
  );

  const stage = useCallback(
    async (selectedFiles: string[]) => {
      if (!repoPath) return;
      try {
        setError(null);
        await gitStage(repoPath, selectedFiles);
        await loadStatus(repoPath);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [repoPath, loadStatus]
  );

  const unstage = useCallback(
    async (selectedFiles: string[]) => {
      if (!repoPath) return;
      try {
        setError(null);
        await gitUnstage(repoPath, selectedFiles);
        await loadStatus(repoPath);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [repoPath, loadStatus]
  );

  const restore = useCallback(
    async (filePath: string) => {
      if (!repoPath) return;
      try {
        setError(null);
        await gitRestore(repoPath, filePath);
        await loadStatus(repoPath);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [repoPath, loadStatus]
  );

  return {
    isRepo: repo !== null,
    branch: repo?.branch ?? '',
    ahead: repo?.ahead ?? 0,
    behind: repo?.behind ?? 0,
    files,
    isLoading,
    error,
    refresh,
    commit,
    pull,
    push,
    getDiff,
    stage,
    unstage,
    restore,
  };
}
