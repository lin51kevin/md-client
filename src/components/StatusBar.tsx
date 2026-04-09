import { useState } from 'react';
import { History, X } from 'lucide-react';

interface StatusBarProps {
  filePath: string | null;
  line: number;
  col: number;
  /** F012: 字数统计 */
  wordCount?: number;
  /** F012: 快照列表（有值时显示版本历史入口） */
  snapshots?: import('../lib/version-history').Snapshot[] | null;
  onSnapshotClick?: () => void;
}

export function StatusBar({ filePath, line, col, wordCount, snapshots, onSnapshotClick }: StatusBarProps) {
  const [showSnapshots, setShowSnapshots] = useState(false);

  const displaySnapshots = showSnapshots ? snapshots : null;

  return (
    <div className="relative shrink-0">
      {/* 主状态栏 */}
      <div className="flex items-center justify-between px-3 py-0.5 bg-slate-200 border-t border-slate-400 text-slate-600 text-xs select-none">
        <div className="flex items-center gap-3">
          <span>{filePath ?? '新文件'}</span>
          {wordCount !== undefined && wordCount > 0 && (
            <span className="tabular-nums">{wordCount} 字</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {snapshots && snapshots.length > 0 && (
            <button
              onClick={() => setShowSnapshots(prev => !prev)}
              title={`版本历史 (${snapshots.length} 个快照)`}
              className="flex items-center gap-1 hover:text-slate-800 transition-colors"
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
        <div className="absolute bottom-full right-2 mb-1 w-80 bg-white border border-slate-300 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
            <span className="text-xs font-medium text-slate-600">📋 版本历史</span>
            <button onClick={() => setShowSnapshots(false)} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {[...displaySnapshots].reverse().map((snap) => (
              <button
                key={snap.id}
                onClick={() => {
                  onSnapshotClick?.();
                  setShowSnapshots(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-50 text-xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{formatTime(snap.timestamp)}</span>
                  <span className="tabular-nums text-slate-400">{snap.contentLength} 字符</span>
                </div>
                <span className="text-slate-400 truncate block mt-0.5" title={snap.preview}>
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
