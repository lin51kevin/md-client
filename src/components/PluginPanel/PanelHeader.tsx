import { X, Package } from 'lucide-react';
import { useI18n } from '../../i18n';

interface PanelHeaderProps {
  onClose: () => void;
}

export function PanelHeader({ onClose }: PanelHeaderProps) {
  const { t } = useI18n();

  return (
    <div
      className="shrink-0 flex items-center gap-1.5 px-3 py-2"
      style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}
    >
      <Package size={14} style={{ color: 'var(--text-secondary)' }} />
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
        {t('plugins.panel')}
      </span>
      <span className="ml-auto">
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
  );
}
