import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, RefreshCw, Download, X } from 'lucide-react';
import { useI18n } from '../i18n';

export interface FileChangeToastProps {
  type: 'modified' | 'deleted';
  filePath: string;
  tabId: string;
  onReload: (tabId: string) => void;
  onKeep: () => void;
  onSaveAs: (tabId: string) => void;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 10_000;

export function FileChangeToast({
  type,
  filePath,
  tabId,
  onReload,
  onKeep,
  onSaveAs,
  onClose,
}: FileChangeToastProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-lg"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        animation: 'fadeInUp 0.2s ease-out',
      }}
    >
      {type === 'modified' ? (
        <AlertTriangle size={16} style={{ color: 'var(--warning-color)', flexShrink: 0 }} />
      ) : (
        <Trash2 size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
      )}

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {type === 'modified' ? t('fileWatcher.modified') : t('fileWatcher.deleted')}
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }} title={filePath}>
          {fileName}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {type === 'modified' ? (
          <>
            <button
              onClick={() => { onReload(tabId); handleDismiss(); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}
            >
              <RefreshCw size={11} />
              {t('fileWatcher.reload')}
            </button>
            <button
              onClick={() => { onKeep(); handleDismiss(); }}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('fileWatcher.keep')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { onSaveAs(tabId); handleDismiss(); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}
            >
              <Download size={11} />
              {t('fileWatcher.saveAs')}
            </button>
          </>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
