import { useState, useEffect, memo } from 'react';
import { History, X, Download, ZoomIn } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatDuration } from '../../lib/utils';
import { useEditorStore } from '../../stores/editor-store';
import { ZOOM_PRESETS } from '../../hooks/useZoom';

interface StatusBarProps {
  filePath: string | null;
  isDirty?: boolean;
  /** Optional override. When omitted, the value is read from editor-store (set by useCursorPosition). */
  line?: number;
  /** Optional override. When omitted, the value is read from editor-store (set by useCursorPosition). */
  col?: number;
  /** F012: 字数统计 */
  wordCount?: number;
  /** 阅读时间 */
  readingTime?: string;
  /** Vim 模式是否启用 */
  vimMode?: boolean;
  /** 保存状态 */
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  /** 多光标数量（>1 时显示） */
  cursorCount?: number;
  /** F012: 快照列表（有值时显示版本历史入口） */
  snapshots?: import('../../lib/storage').Snapshot[] | null;
  onSnapshotRestore?: (snapshotId: string) => void;
  /** Update available info */
  updateAvailable?: { version: string } | null;
  onUpdateClick?: () => void;
  /** Focus start timestamp (ms). When set, StatusBar runs its own 1s timer. */
  focusStartTime?: number;
  /** WYSIWYG mode — hide editor-specific info */
  wysiwygMode?: boolean;
  /** Current zoom level (50–200) */
  zoomLevel?: number;
  /** Called when user selects a zoom preset */
  onZoomChange?: (level: number) => void;
  /** Detected language name for the active file (e.g. 'TypeScript', 'Python') */
  languageName?: string;
}

export const StatusBar = memo(function StatusBar({ filePath, isDirty, line, col, wordCount, readingTime, cursorCount, vimMode, saveStatus, snapshots, onSnapshotRestore, updateAvailable, onUpdateClick, focusStartTime, wysiwygMode, zoomLevel, onZoomChange, languageName }: StatusBarProps) {
  const { t } = useI18n();
  const storeCursor = useEditorStore((s) => s.cursor);
  // Props override store — keep backward-compat for tests that pass line/col directly
  const displayLine = line ?? storeCursor.line;
  const displayCol = col ?? storeCursor.col;
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showZoomPicker, setShowZoomPicker] = useState(false);

  // Self-contained 1s timer — only this component re-renders
  const [focusDuration, setFocusDuration] = useState('');
  useEffect(() => {
    if (focusStartTime == null) {
      setFocusDuration('');
      return;
    }
    const tick = () => setFocusDuration(formatDuration(Date.now() - focusStartTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [focusStartTime]);

  const displaySnapshots = showSnapshots ? snapshots : null;

  return (
    <div className="relative shrink-0">
      {/* 主状态栏 */}
      <div role="status" aria-live="polite" className="flex items-center justify-between px-3 py-0.5 text-xs select-none" style={{ backgroundColor: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            {isDirty && <span className="font-bold" style={{ color: 'var(--warning-color)' }} title={t('status.unsaved')}>●</span>}
            <span>{filePath ?? t('status.newFile')}</span>
          </span>
          {wordCount !== undefined && wordCount > 0 && (
            <span className="tabular-nums">{t('status.words', { count: wordCount })}{readingTime ? ` | ${readingTime}` : ''}{focusDuration ? ` | ⏱ ${focusDuration}` : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {snapshots && snapshots.length > 0 && (
            <button
              onClick={() => setShowSnapshots(prev => !prev)}
              title={t('status.versionHistory', { count: snapshots.length })}
              className="flex items-center gap-1 transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = '')}
            >
              <History size={12} strokeWidth={1.8} />
              <span>{snapshots.length}</span>
            </button>
          )}
          {!wysiwygMode && cursorCount !== undefined && cursorCount > 1 && (
            <span className="tabular-nums" style={{ color: 'var(--accent-color)' }}>{t('status.cursorCount', { count: cursorCount })}</span>
          )}
          {updateAvailable && (
            <button
              onClick={onUpdateClick}
              title={t('update.statusBarTitle', { version: updateAvailable.version })}
              className="flex items-center gap-1 transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-color)')}
              onMouseLeave={e => (e.currentTarget.style.color = '')}
            >
              <Download size={12} strokeWidth={1.8} />
              <span>v{updateAvailable.version}</span>
            </button>
          )}
          {!wysiwygMode && vimMode && <span className="font-mono font-bold" style={{ color: 'var(--accent-color)' }}>NORMAL</span>}
          {saveStatus === 'saving' && <span>💾</span>}
          {saveStatus === 'unsaved' && <span style={{ color: 'var(--warning-color)' }}>⚠️</span>}
          {zoomLevel !== undefined && (
            <button
              onClick={() => setShowZoomPicker(prev => !prev)}
              title={t('status.zoomTitle')}
              className="flex items-center gap-1 tabular-nums transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = '')}
            >
              <ZoomIn size={12} strokeWidth={1.8} />
              <span>{zoomLevel}%</span>
            </button>
          )}
          {!wysiwygMode && <span className="tabular-nums">{t('status.lineCol', { line: displayLine, col: displayCol })}</span>}
          {languageName && <span className="ml-2 text-xs opacity-70">{languageName}</span>}
        </div>
      </div>

      {/* F012 — 版本历史弹出面板 */}
      {displaySnapshots && displaySnapshots.length > 0 && (
        <div className="absolute bottom-full right-2 mb-1 w-80 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('status.versionHistoryTitle')}</span>
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
                  <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{t('status.charCount', { count: snap.contentLength })}</span>
                </div>
                <span className="truncate block mt-0.5" style={{ color: 'var(--text-secondary)' }} title={snap.preview}>
                  {snap.preview || t('status.emptyFile')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Zoom preset picker popup */}
      {showZoomPicker && zoomLevel !== undefined && (
        <div className="absolute bottom-full right-2 mb-1 w-36 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('status.zoomTitle')}</span>
            <button onClick={() => setShowZoomPicker(false)} style={{ color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="p-1">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  onZoomChange?.(preset);
                  setShowZoomPicker(false);
                }}
                className="w-full text-left px-3 py-1 rounded text-xs transition-colors"
                style={{
                  color: preset === zoomLevel ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: preset === zoomLevel ? 600 : 400,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                {preset}%{preset === 100 ? ` (${t('status.zoomReset')})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}
