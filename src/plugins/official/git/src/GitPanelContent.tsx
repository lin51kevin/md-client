import { createElement, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { PluginContext } from '../../../plugin-sandbox';
import { useGit } from './useGit';
import type { GitFileStatus, GitFileStatusType } from './git-commands';
import { createGitT } from './i18n';

const STORAGE_KEY_FILETREE_ROOT = 'marklite-filetree-root';
const STORAGE_KEY_GIT_MD_ONLY = 'marklite-git-md-only';

const MD_PATTERN = /\.(md|mdx|markdown|mdown|mkd|mkdn|txt|rst|adoc|org)$/i;

const STATUS_LABELS: Record<GitFileStatusType, { label: string; color: string }> = {
  modified:   { label: 'M', color: '#f59e0b' },
  added:      { label: 'A', color: '#22863a' },
  deleted:    { label: 'D', color: '#cb2431' },
  untracked:  { label: '?', color: 'var(--text-tertiary)' },
  renamed:    { label: 'R', color: '#0969da' },
  conflicted: { label: '!', color: '#ef4444' },
};

function getLocale(): string {
  try {
    return localStorage.getItem('marklite-locale') ?? 'en';
  } catch {
    return 'en';
  }
}

function getGitMdOnly(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_GIT_MD_ONLY) === 'true';
  } catch {
    return false;
  }
}

function getFileTreeRoot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_FILETREE_ROOT) ?? '';
  } catch {
    return '';
  }
}

export class GitPanelContent {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  render() {
    const ctx = this.context;

    function GitPanelWrapper() {
      const repoPath = getFileTreeRoot() || null;
      const git = useGit(repoPath);
      const t = createGitT(getLocale());
      const mdOnly = getGitMdOnly();
      const [commitMsg, setCommitMsg] = useState('');
      const [diffModal, setDiffModal] = useState<{ filePath: string; content: string } | null>(null);
      const [diffLoading, setDiffLoading] = useState(false);

      // Keep a stable ref to git so callbacks don't depend on the git object
      const gitRef = useRef(git);
      gitRef.current = git;

      const filteredFiles = useMemo(() =>
        mdOnly
          ? git.files.filter((f: GitFileStatus) => MD_PATTERN.test(f.path))
          : git.files,
        [mdOnly, git.files],
      );

      const stagedFiles = useMemo(() =>
        filteredFiles.filter((f: GitFileStatus) => f.staged),
        [filteredFiles],
      );

      const canCommit = commitMsg.trim().length > 0 && stagedFiles.length > 0;

      const handleCommit = useCallback(() => {
        const g = gitRef.current;
        const msg = commitMsg.trim();
        if (!msg || stagedFiles.length === 0) return;
        g.commit(msg, stagedFiles.map((f: GitFileStatus) => f.path));
        setCommitMsg('');
      }, [commitMsg, stagedFiles]);

      const openDiff = useCallback(async (path: string) => {
        setDiffLoading(true);
        setDiffModal({ filePath: path, content: '' });
        try {
          const result = await gitRef.current.getDiff(path);
          setDiffModal({ filePath: path, content: result });
        } catch {
          setDiffModal({ filePath: path, content: '' });
        } finally {
          setDiffLoading(false);
        }
      }, []);

      const closeDiff = useCallback(() => setDiffModal(null), []);

      useEffect(() => {
        if (!diffModal) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDiff(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }, [diffModal, closeDiff]);

      const openFile = useCallback((filePath: string) => {
        const root = getFileTreeRoot();
        ctx.workspace.openFile(root ? `${root}/${filePath}` : filePath);
      }, []);

      if (!git.isRepo) {
        return createElement('div', {
          className: 'w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center text-xs select-none',
          style: { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' },
        },
          createElement('span', null, t('git.noRepo')),
          createElement('span', { style: { fontSize: 10 } }, t('git.noRepoHint')),
        );
      }

      return createElement('div', {
        className: 'w-full h-full flex flex-col overflow-hidden text-xs select-none',
        style: { backgroundColor: 'var(--bg-secondary)' },
      },
        // Header
        createElement('div', {
          className: 'shrink-0 flex items-center gap-1.5 px-3 py-2',
          style: { backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' },
        },
          createElement('span', {
            className: 'text-xs font-medium',
            style: { color: 'var(--text-primary)' },
          }, t('git.panel')),
          createElement('span', { className: 'ml-auto flex items-center gap-0.5' },
            createElement('button', {
              onClick: () => gitRef.current.refresh(),
              title: t('git.refresh'),
              className: 'shrink-0 flex items-center justify-center',
              style: { color: 'var(--text-secondary)', padding: 3 },
            }, git.isLoading ? '⟳' : '↻'),
          ),
        ),

        // Branch info
        createElement('div', {
          className: 'flex items-center justify-between px-3 py-1.5 shrink-0',
          style: { borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' },
        },
          createElement('span', { className: 'font-mono', style: { color: 'var(--text-secondary)' } }, git.branch),
          createElement('span', { className: 'flex items-center gap-2' },
            git.behind > 0 && createElement('span', { style: { color: '#0969da' } }, `↓${git.behind}`),
            git.ahead > 0 && createElement('span', { style: { color: '#22863a' } }, `↑${git.ahead}`),
          ),
        ),

        // Error
        git.error && createElement('div', {
          className: 'flex items-start gap-1.5 px-3 py-2 mx-2 my-1.5 rounded text-[10px]',
          style: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-color)' },
        }, createElement('span', { className: 'break-all' }, git.error)),

        // Loading
        git.isLoading && createElement('div', {
          className: 'px-3 py-1.5 text-[10px]',
          style: { color: 'var(--text-tertiary)' },
        }, t('git.loading')),

        // File list
        createElement('div', { className: 'flex-1 overflow-y-auto' },
          filteredFiles.length === 0 && !git.isLoading
            ? createElement('div', {
                className: 'px-3 py-4 text-center text-[10px]',
                style: { color: 'var(--text-tertiary)' },
              }, t('git.noChanges'))
            : createElement('div', { className: 'py-1' },
                ...filteredFiles.map((f: GitFileStatus) => {
                  const { label, color } = STATUS_LABELS[f.status] ?? { label: '?', color: 'var(--text-tertiary)' };
                  return createElement('div', {
                    key: f.path,
                    className: 'group flex items-center gap-1.5 px-3 py-1 transition-colors',
                    onDoubleClick: () => { if (f.status !== 'deleted') openFile(f.path); },
                  },
                    createElement('span', {
                      className: 'shrink-0 font-bold text-[10px] w-3 text-center',
                      style: { color },
                    }, label),
                    f.staged && createElement('span', {
                      className: 'shrink-0 flex items-center justify-center rounded text-[8px]',
                      style: { color: '#22863a', width: 14, height: 14, backgroundColor: 'rgba(34,134,58,0.12)' },
                      title: t('git.staged'),
                    }, '✓'),
                    createElement('span', {
                      className: 'truncate min-w-0 flex-1 text-xs',
                      style: { color: 'var(--text-primary)' },
                      title: f.path,
                    }, f.path.split('/').pop() ?? f.path),
                    createElement('span', { className: 'shrink-0 flex items-center gap-0.5' },
                      f.status !== 'deleted' && createElement('button', {
                        title: t('git.openFile'),
                        onClick: (e: React.MouseEvent) => { e.stopPropagation(); openFile(f.path); },
                        className: 'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                        style: { color: 'var(--text-secondary)', padding: 2 },
                      }, '↗'),
                      createElement('button', {
                        title: t('git.viewDiff'),
                        onClick: (e: React.MouseEvent) => { e.stopPropagation(); openDiff(f.path); },
                        className: 'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                        style: { color: 'var(--text-secondary)', padding: 2 },
                      }, '≠'),
                      createElement('button', {
                        title: f.staged ? t('git.unstage') : t('git.stage'),
                        onClick: (e: React.MouseEvent) => { e.stopPropagation(); f.staged ? gitRef.current.unstage([f.path]) : gitRef.current.stage([f.path]); },
                        className: 'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                        style: { color: 'var(--text-secondary)', padding: 2 },
                      }, f.staged ? '−' : '+'),
                      createElement('button', {
                        title: t('git.discard'),
                        onClick: (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (window.confirm(t('git.discardConfirm', { path: f.path }))) {
                            gitRef.current.restore(f.path);
                          }
                        },
                        className: 'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                        style: { color: 'var(--text-secondary)', padding: 2 },
                      }, '↶'),
                    ),
                  );
                }),
              ),
        ),

        // Commit area
        createElement('div', {
          className: 'shrink-0 p-2 space-y-2',
          style: { borderTop: '1px solid var(--border-color)' },
        },
          createElement('input', {
            type: 'text',
            value: commitMsg,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCommitMsg(e.target.value),
            placeholder: t('git.commitPlaceholder'),
            className: 'w-full text-xs px-2 py-1 rounded outline-none',
            style: {
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            },
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && !e.shiftKey && canCommit) handleCommit();
            },
          }),
          createElement('div', { className: 'flex gap-1.5' },
            createElement('button', {
              onClick: handleCommit,
              disabled: !canCommit,
              className: 'flex items-center gap-1 flex-1 justify-center px-2 py-1 rounded text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              style: { backgroundColor: 'var(--accent-color)', color: '#fff' },
            }, t('git.commit')),
            createElement('button', {
              onClick: () => gitRef.current.pull(),
              className: 'px-2 py-1 rounded text-xs transition-colors',
              style: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' },
              title: t('git.pull'),
            }, t('git.pull')),
            createElement('button', {
              onClick: () => gitRef.current.push(),
              className: 'px-2 py-1 rounded text-xs transition-colors',
              style: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' },
              title: t('git.push'),
            }, t('git.push')),
          ),
        ),

        // Diff modal
        diffModal && createElement('div', {
          className: 'fixed inset-0 z-50 flex items-center justify-center',
          style: { backgroundColor: 'rgba(0,0,0,0.5)' },
          onClick: closeDiff,
        },
          createElement('div', {
            className: 'relative flex flex-col rounded-lg shadow-xl overflow-hidden',
            style: {
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              width: '80vw',
              maxWidth: 900,
              maxHeight: '80vh',
            },
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
            createElement('div', {
              className: 'flex items-center gap-2 px-4 py-2 shrink-0',
              style: { borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' },
            },
              createElement('span', {
                className: 'text-xs font-mono truncate flex-1',
                style: { color: 'var(--text-primary)' },
              }, diffModal.filePath),
              createElement('button', {
                onClick: closeDiff,
                className: 'shrink-0 flex items-center justify-center',
                style: { color: 'var(--text-secondary)', padding: 3 },
              }, '✕'),
            ),
            createElement('div', { className: 'flex-1 overflow-auto p-4' },
              diffLoading
                ? createElement('div', {
                    className: 'text-xs py-8 text-center',
                    style: { color: 'var(--text-tertiary)' },
                  }, t('git.loadingDiff'))
                : createElement(DiffViewer, { diff: diffModal.content }),
            ),
          ),
        ),
      );
    }

    return createElement(GitPanelWrapper);
  }
}

// ── Inline DiffViewer ──────────────────────────────────────────────────────

function DiffViewer({ diff }: { diff: string }) {
  if (!diff.trim()) {
    return createElement('div', {
      className: 'flex items-center justify-center h-24 text-xs rounded',
      style: { color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' },
    }, '无差异 — no diff');
  }

  const lines = diff.split('\n');
  return createElement('div', {
    className: 'text-xs font-mono overflow-auto rounded',
    style: { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' },
  },
    createElement('pre', { className: 'p-2 overflow-auto leading-5 m-0' },
      ...lines.map((line, idx) => {
        let bg = 'transparent';
        let color = 'var(--text-primary)';

        if (line.startsWith('+') && !line.startsWith('+++')) {
          bg = 'rgba(0, 150, 80, 0.15)';
          color = '#22863a';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          bg = 'rgba(220, 50, 50, 0.12)';
          color = '#cb2431';
        } else if (line.startsWith('@@')) {
          bg = 'rgba(0, 100, 200, 0.08)';
          color = 'var(--text-secondary)';
        }

        return createElement('div', { key: idx, style: { backgroundColor: bg, color } }, line || ' ');
      }),
    ),
  );
}
