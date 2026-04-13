import { useState, useCallback } from 'react';
import { X, GitBranch, RefreshCw, ArrowUp, ArrowDown, AlertCircle, GitCommit } from 'lucide-react';
import type { GitFileStatus, GitFileStatusType } from '../lib/git-commands';

interface GitPanelProps {
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  isLoading: boolean;
  error: string | null;
  onCommit: (message: string, files: string[]) => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<GitFileStatusType, { label: string; color: string }> = {
  modified:   { label: 'M', color: '#f59e0b' },
  added:      { label: 'A', color: '#22863a' },
  deleted:    { label: 'D', color: '#cb2431' },
  untracked:  { label: '?', color: 'var(--text-tertiary)' },
  renamed:    { label: 'R', color: '#0969da' },
  conflicted: { label: '!', color: '#ef4444' },
};

export function GitPanel({
  isRepo,
  branch,
  ahead,
  behind,
  files,
  isLoading,
  error,
  onCommit,
  onPull,
  onPush,
  onRefresh,
  onClose,
}: GitPanelProps) {
  const [commitMsg, setCommitMsg] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCommit = useCallback(() => {
    if (!commitMsg.trim() || selected.size === 0) return;
    onCommit(commitMsg.trim(), Array.from(selected));
    setCommitMsg('');
    setSelected(new Set());
  }, [commitMsg, selected, onCommit]);

  const canCommit = commitMsg.trim().length > 0 && selected.size > 0 && files.length > 0;

  return (
    <div
      className="flex flex-col h-full text-xs select-none"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderLeft: '1px solid var(--border-color)',
        width: 240,
        minWidth: 200,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
          <GitBranch size={13} />
          <span>Source Control</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            title="刷新"
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            title="关闭"
            aria-label="关闭"
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Not a git repo */}
      {!isRepo ? (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <GitBranch size={28} strokeWidth={1.2} />
          <span>不是 Git 仓库</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
            请在已初始化 git 的文件夹中打开文件
          </span>
        </div>
      ) : (
        <>
          {/* Branch + sync info */}
          <div
            className="flex items-center justify-between px-3 py-1.5 shrink-0"
            style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <GitBranch size={11} />
              <span className="font-mono">{branch}</span>
            </div>
            <div className="flex items-center gap-2">
              {behind > 0 && (
                <span className="flex items-center gap-0.5" style={{ color: '#0969da' }}>
                  <ArrowDown size={10} />{behind}
                </span>
              )}
              {ahead > 0 && (
                <span className="flex items-center gap-0.5" style={{ color: '#22863a' }}>
                  <ArrowUp size={10} />{ahead}
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-1.5 px-3 py-2 mx-2 my-1.5 rounded text-[10px]"
              style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-color)' }}
            >
              <AlertCircle size={11} className="shrink-0 mt-0.5" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div
              className="px-3 py-1.5 text-[10px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              加载中…
            </div>
          )}

          {/* File list */}
          <div className="flex-1 overflow-y-auto">
            {files.length === 0 && !isLoading ? (
              <div
                className="px-3 py-4 text-center text-[10px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                工作区无变更
              </div>
            ) : (
              <div className="py-1">
                {files.map((f) => {
                  const { label, color } = STATUS_LABELS[f.status] ?? { label: '?', color: 'var(--text-tertiary)' };
                  const isChecked = selected.has(f.path);
                  return (
                    <label
                      key={f.path}
                      className="flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors"
                      style={{ backgroundColor: isChecked ? 'var(--accent-bg)' : 'transparent' }}
                      onMouseEnter={(e) => {
                        if (!isChecked) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(f.path)}
                        className="shrink-0"
                      />
                      <span
                        className="shrink-0 font-bold text-[10px] w-3 text-center"
                        style={{ color }}
                      >
                        {label}
                      </span>
                      <span
                        className="truncate min-w-0"
                        style={{ color: 'var(--text-primary)' }}
                        title={f.path}
                      >
                        {f.path.split('/').pop() ?? f.path}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Commit area */}
          <div
            className="shrink-0 p-2 space-y-2"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <input
              type="text"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="提交信息…"
              className="w-full text-xs px-2 py-1 rounded outline-none"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canCommit) handleCommit();
              }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCommit}
                disabled={!canCommit}
                className="flex items-center gap-1 flex-1 justify-center px-2 py-1 rounded text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: '#fff',
                }}
              >
                <GitCommit size={11} />
                提交
              </button>
              <button
                onClick={onPull}
                className="px-2 py-1 rounded text-xs transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
                title="Pull"
              >
                Pull
              </button>
              <button
                onClick={onPush}
                className="px-2 py-1 rounded text-xs transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
                title="Push"
              >
                Push
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
