/**
 * git-commands — Tauri invoke 封装，前端 Git 操作 API
 */

import { invoke } from '@tauri-apps/api/core';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GitFileStatusType =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'untracked'
  | 'renamed'
  | 'conflicted';

export interface GitFileStatus {
  path: string;
  status: GitFileStatusType;
}

export interface GitRepo {
  path: string;
  branch: string;
  ahead: number;
  behind: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * 获取仓库信息（分支、领先/落后提交数）。
 * 如果路径不是 git 仓库则返回 null，不抛出异常。
 */
export async function gitGetRepo(path: string): Promise<GitRepo | null> {
  try {
    const result = await invoke<GitRepo>('git_get_repo', { path });
    return result;
  } catch {
    return null;
  }
}

/**
 * 获取工作区文件状态列表（已修改、新增、未追踪等）。
 */
export async function gitGetStatus(path: string): Promise<GitFileStatus[]> {
  return invoke<GitFileStatus[]>('git_get_status', { path });
}

/**
 * 获取指定文件的 diff 字符串（unified diff 格式）。
 */
export async function gitDiff(path: string, filePath: string): Promise<string> {
  return invoke<string>('git_diff', { path, filePath });
}

/**
 * 提交暂存区内指定文件（前端先做基本验证）。
 */
export async function gitCommit(
  path: string,
  message: string,
  files: string[]
): Promise<void> {
  if (!message.trim()) {
    throw new Error('Commit message cannot be empty');
  }
  if (files.length === 0) {
    throw new Error('No files selected for commit');
  }
  return invoke<void>('git_commit', { path, message, files });
}

/**
 * 从远端拉取最新代码。
 */
export async function gitPull(path: string): Promise<void> {
  return invoke<void>('git_pull', { path });
}

/**
 * 推送本地提交到远端。
 */
export async function gitPush(path: string): Promise<void> {
  return invoke<void>('git_push', { path });
}
