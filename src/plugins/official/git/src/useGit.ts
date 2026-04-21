import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
} from './git-commands';

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

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

  // Use ref to avoid recreating callbacks when repoPath changes
  const repoPathRef = useRef(repoPath);
  repoPathRef.current = repoPath;

  // Full load: fetches repo info + status. Used for initial load and refresh.
  const loadFull = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const repoInfo = await gitGetRepo(path);
      const statusList = repoInfo ? await gitGetStatus(path) : [];
      // Batch all state updates together to avoid intermediate renders
      setRepo(repoInfo);
      setFiles(statusList);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Light refresh: only updates status list (files). Preserves repo/isRepo
  // to prevent the panel from flashing "not a repo" during operations.
  const refreshStatus = useCallback(async (path: string) => {
    try {
      const statusList = await gitGetStatus(path);
      setFiles(statusList);
      // Also refresh repo info (branch, ahead/behind) without clearing it first
      const repoInfo = await gitGetRepo(path);
      if (repoInfo) setRepo(repoInfo);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!repoPath) {
      setRepo(null);
      setFiles([]);
      return;
    }
    loadFull(repoPath);
  }, [repoPath, loadFull]);

  const refresh = useCallback(() => {
    const p = repoPathRef.current;
    if (p) loadFull(p);
  }, [loadFull]);

  const commit = useCallback(
    async (message: string, selectedFiles: string[]) => {
      const p = repoPathRef.current;
      if (!p) return;
      try {
        setError(null);
        await gitCommit(p, message, selectedFiles);
        await refreshStatus(p);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [refreshStatus],
  );

  const pull = useCallback(async () => {
    const p = repoPathRef.current;
    if (!p) return;
    try {
      setError(null);
      await gitPull(p);
      await refreshStatus(p);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [refreshStatus]);

  const push = useCallback(async () => {
    const p = repoPathRef.current;
    if (!p) return;
    try {
      setError(null);
      await gitPush(p);
      await refreshStatus(p);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [refreshStatus]);

  const getDiff = useCallback(
    async (filePath: string): Promise<string> => {
      const p = repoPathRef.current;
      if (!p) return '';
      return gitDiff(p, filePath);
    },
    [],
  );

  const stage = useCallback(
    async (selectedFiles: string[]) => {
      const p = repoPathRef.current;
      if (!p) return;
      try {
        setError(null);
        await gitStage(p, selectedFiles);
        await refreshStatus(p);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [refreshStatus],
  );

  const unstage = useCallback(
    async (selectedFiles: string[]) => {
      const p = repoPathRef.current;
      if (!p) return;
      try {
        setError(null);
        await gitUnstage(p, selectedFiles);
        await refreshStatus(p);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [refreshStatus],
  );

  const restore = useCallback(
    async (filePath: string) => {
      const p = repoPathRef.current;
      if (!p) return;
      try {
        setError(null);
        await gitRestore(p, filePath);
        await refreshStatus(p);
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [refreshStatus],
  );

  // Stabilize the return object so consumers don't re-render on every state change.
  // Callbacks are already stable (useCallback with stable deps via refs).
  return useMemo(() => ({
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
  }), [repo, files, isLoading, error, refresh, commit, pull, push, getDiff, stage, unstage, restore]);
}
