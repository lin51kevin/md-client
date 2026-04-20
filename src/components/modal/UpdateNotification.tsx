import { Download, X, RotateCw } from 'lucide-react';
import { useI18n } from '../../i18n';

interface UpdateNotificationProps {
  version: string;
  releaseNotes?: string;
  onDownload: () => void;
  onDismiss: () => void;
  downloadProgress?: number;
  downloading?: boolean;
  readyToRestart?: boolean;
  onRestart?: () => void;
}

function openUrl(url: string) {
  import('@tauri-apps/plugin-opener')
    .then(m => m.openUrl(url))
    .catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
}

/** Render text with [label](url) markdown links as clickable spans */
function ReleaseNotes({ text }: { text: string }) {
  const mdLink = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = mdLink.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const [, label, url] = match;
    parts.push(
      <button
        key={key++}
        onClick={() => openUrl(url)}
        style={{ color: 'var(--accent-color)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
      >
        {label}
      </button>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return <>{parts}</>;
}

export function UpdateNotification({
  version,
  releaseNotes,
  onDownload,
  onDismiss,
  downloadProgress,
  downloading,
  readyToRestart,
  onRestart,
}: UpdateNotificationProps) {
  const { t } = useI18n();

  return (
    <div
      className="flex flex-col gap-2 w-72 rounded-lg shadow-xl p-3"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download size={14} style={{ color: 'var(--accent-color)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('update.available', { version })}
          </span>
        </div>
        <button onClick={onDismiss} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={14} />
        </button>
      </div>

      {releaseNotes && (
        <div className="text-xs leading-relaxed max-h-20 overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>
          <ReleaseNotes text={releaseNotes} />
        </div>
      )}

      {downloading && downloadProgress !== undefined && (
        <div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${downloadProgress}%`, backgroundColor: 'var(--accent-color)' }}
            />
          </div>
          <div className="text-xs mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
            {downloadProgress}%
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {readyToRestart && onRestart ? (
          <button
            onClick={onRestart}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded"
            style={{ backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <RotateCw size={12} />
            {t('update.restart')}
          </button>
        ) : (
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded"
            style={{
              backgroundColor: downloading ? 'var(--bg-tertiary)' : 'var(--accent-color)',
              color: downloading ? 'var(--text-tertiary)' : '#fff',
              border: 'none',
              cursor: downloading ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={12} />
            {downloading ? t('update.downloading') : t('update.install')}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-xs px-3 py-1 rounded"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
        >
          {t('update.dismiss')}
        </button>
      </div>
    </div>
  );
}
