import { useState, useCallback, useEffect } from 'react';
import { X, GitBranch, RefreshCw, ArrowUp, ArrowDown, AlertCircle, GitCommit, FileDiff, Plus, Minus, Undo2, ExternalLink, Check } from 'lucide-react';
import type { GitFileStatus, GitFileStatusType } from '../lib/git-commands';
import { DiffViewer } from './DiffViewer';
import { useI18n } from '../i18n';

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
  onDiff: (filePath: string) => Promise<string>;
  onStage: (files: string[]) => Promise<void>;
  onUnstage: (files: string[]) => Promise<void>;
  onRestore: (filePath: string) => Promise<void>;
  onFileOpen: (filePath: string) => void;
}

const STATUS_LABELS: Record<GitFileStatusType, { label: string; color: string }> = {
  modified:   { label: 'M', color: '#f59e0b' },
  added:      { label: 'A', color: '#22863a' },
  deleted:    { label: 'D', color: '#cb2431' },
  untracked:  { label: '?', color: 'var(--text-tertiary)' },
  renamed:    { label: 'R', color: '#0969da' },
  conflicted: { label: '!', color: '#ef4444' },
};

/** Tiny icon button that only shows on hover of parent row */
function ActionBtn({ title, onClick, children }: { title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className="shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ color: 'var(--text-secondary)', padding: 2 }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >
      {children}
    </button>
  );
}

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
  onDiff,
  onStage,
  onUnstage,
  onRestore,
  onFileOpen,
}: GitPanelProps) {
  const { t } = useI18n();
  const [commitMsg, setCommitMsg] = useState('');
  const [diffModal, setDiffModal] = useState<{ filePath: string; content: string } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // ── Diff modal ──
  const openDiff = useCallback(async (path: string) => {
    setDiffLoading(true);
    setDiffModal({ filePath: path, content: '' });
    try {
      const result = await onDiff(path);
      setDiffModal({ filePath: path, content: result });
    } catch {
      setDiffModal({ filePath: path, content: '' });
    } finally {
      setDiffLoading(false);
    }
  }, [onDiff]);

  const closeDiff = useCallback(() => { setDiffModal(null); }, []);

  // Esc to close modal
  useEffect(() => {
    if (!diffModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDiff(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [diffModal, closeDiff]);

  // ── Commit ──
  const stagedFiles = files.filter(f => f.staged);
  const handleCommit = useCallback(() => {
    if (!commitMsg.trim() || stagedFiles.length === 0) return;
    onCommit(commitMsg.trim(), stagedFiles.map(f => f.path));
    setCommitMsg('');
  }, [commitMsg, stagedFiles, onCommit]);

  const canCommit = commitMsg.trim().length > 0 && stagedFiles.length > 0;

  return (
    <div
      className="w-60 shrink-0 h-full flex flex-col overflow-hidden text-xs select-none"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-2"
        style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}
      >
        <GitBranch size={14} style={{ color: 'var(--text-secondary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('git.panel')}</span>
        <span className="ml-auto flex items-center gap-0.5">
          <button
            onClick={onRefresh}
            title={t('git.refresh')}
            className="shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', padding: 3 }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            title={t('common.close')}
            aria-label={t('common.close')}
            className="shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', padding: 3 }}
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </span>
      </div>

      {/* Not a git repo */}
      {!isRepo ? (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <GitBranch size={28} strokeWidth={1.2} />
          <span>{ t('git.noRepo') }</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
            { t('git.noRepoHint') }
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
            { t('git.loading') }
            </div>
          )}

          {/* File list */}
          <div className="flex-1 overflow-y-auto">
            {files.length === 0 && !isLoading ? (
              <div
                className="px-3 py-4 text-center text-[10px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                { t('git.noChanges') }
              </div>
            ) : (
              <div className="py-1">
                {files.map((f) => {
                  const { label, color } = STATUS_LABELS[f.status] ?? { label: '?', color: 'var(--text-tertiary)' };
                  return (
                    <div
                      key={f.path}
                      className="group flex items-center gap-1.5 px-3 py-1 transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Status badge */}
                      <span
                        className="shrink-0 font-bold text-[10px] w-3 text-center"
                        style={{ color }}
                      >
                        {label}
                      </span>
                      {/* Staged indicator */}
                      {f.staged && (
                        <span
                          className="shrink-0 flex items-center justify-center rounded text-[8px]"
                          style={{
                            color: '#22863a',
                            width: 14,
                            height: 14,
                            backgroundColor: 'rgba(34,134,58,0.12)',
                          }}
                          title={t('git.staged')}
                        >
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}
                      {/* File name */}
                      <span
                        className="truncate min-w-0 flex-1 text-xs"
                        style={{ color: 'var(--text-primary)' }}
                        title={f.path}
                      >
                        {f.path.split('/').pop() ?? f.path}
                      </span>
                      {/* Action buttons (visible on hover) */}
                      <span className="shrink-0 flex items-center gap-0.5">
                        {f.status !== 'deleted' && (
                          <ActionBtn title={t('git.openFile')} onClick={() => onFileOpen(f.path)}>
                            <ExternalLink size={11} />
                          </ActionBtn>
                        )}
                        <ActionBtn title={t('git.viewDiff')} onClick={() => openDiff(f.path)}>
                          <FileDiff size={11} />
                        </ActionBtn>
                        <ActionBtn title={f.staged ? t('git.unstage') : t('git.stage')} onClick={() => f.staged ? onUnstage([f.path]) : onStage([f.path])}>
                          {f.staged ? <Minus size={11} /> : <Plus size={11} />}
                        </ActionBtn>
                        <ActionBtn title={t('git.discard')} onClick={() => {
                          if (window.confirm(t('git.discardConfirm', { path: f.path }))) {
                            onRestore(f.path);
                          }
                        }}>
                          <Undo2 size={11} />
                        </ActionBtn>
                      </span>
                    </div>
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
              placeholder={t('git.commitPlaceholder')}
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
                {t('git.commit')}
              </button>
              <button
                onClick={onPull}
                className="px-2 py-1 rounded text-xs transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
                title={t('git.pull')}
              >
                {t('git.pull')}
              </button>
              <button
                onClick={onPush}
                className="px-2 py-1 rounded text-xs transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
                title={t('git.push')}
              >
                {t('git.push')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Diff modal overlay */}
      {diffModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeDiff}
        >
          <div
            className="relative flex flex-col rounded-lg shadow-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              width: '80vw',
              maxWidth: 900,
              maxHeight: '80vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center gap-2 px-4 py-2 shrink-0"
              style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
            >
              <FileDiff size={14} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-xs font-mono truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                {diffModal.filePath}
              </span>
              <button
                onClick={closeDiff}
                className="shrink-0 flex items-center justify-center"
                style={{ color: 'var(--text-secondary)', padding: 3 }}
                title={t('common.close')}
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            {/* Modal body */}
            <div className="flex-1 overflow-auto p-4">
              {diffLoading ? (
                <div className="text-xs py-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
                  {t('git.loadingDiff')}
                </div>
              ) : (
                <DiffViewer diff={diffModal.content} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
