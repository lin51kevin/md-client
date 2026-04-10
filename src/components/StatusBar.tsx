import { useState } from 'react';
import { History, X } from 'lucide-react';

interface StatusBarProps {
  filePath: string | null;
  isDirty?: boolean;
  line: number;
  col: number;
  /** F012: 字数统计 */
  wordCount?: number;
  /** F012: 快照列表（有值时显示版本历史入口） */
  snapshots?: import('../lib/version-history').Snapshot[] | null;
  onSnapshotRestore?: (snapshotId: string) => void;
}

export function StatusBar({ filePath, isDirty, line, col, wordCount, snapshots, onSnapshotRestore }: StatusBarProps) {
  const [showSnapshots, setShowSnapshots] = useState(false);

  const displaySnapshots = showSnapshots ? snapshots : null;

  return (
    <div className="relative shrink-0">
      {/* 主状态栏 */}
      <div className="flex items-center justify-between px-3 py-0.5 text-xs select-none" style={{ backgroundColor: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            {isDirty && <span className="font-bold" style={{ color: 'var(--warning-color)' }} title="有未保存的更改">●</span>}
            <span>{filePath ?? '新文件'}</span>
          </span>
          {wordCount !== undefined && wordCount > 0 && (
            <span className="tabular-nums">{wordCount} 字</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {snapshots && snapshots.length > 0 && (
            <button
              onClick={() => setShowSnapshots(prev => !prev)}
              title={`版本历史 (${snapshots.length} 个快照)`}
              className="flex items-center gap-1 transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = '')}
            >
              <History size={12} strokeWidth={1.8} />
              <span>{snapshots.length}</span>
            </button>
          )}
          <span className="tabular-nums">行 {line}，列 {col}</span>
        </div>
      </div>

      {/* F012 — 版本历史弹出面板 */}
      {displaySnapshots && displaySnapshots.length > 0 && (
        <div className="absolute bottom-full right-2 mb-1 w-80 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>📋 版本历史</span>
            <button onClick={() => setShowSnapshots(false)} style={{ color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {[...displaySnapshots].reverse().map((snap) => (
              <button
                key={snap.id}
                onClick={() => {
                  onSnapshotRestore?.(snap.id);
                  setShowSnapshots(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs group"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{formatTime(snap.timestamp)}</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{snap.contentLength} 字符</span>
                </div>
                <span className="truncate block mt-0.5" style={{ color: 'var(--text-secondary)' }} title={snap.preview}>
                  {snap.preview || '(空文件)'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}
