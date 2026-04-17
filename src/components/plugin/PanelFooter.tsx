import { Download } from 'lucide-react';
import { useI18n } from '../../i18n';

interface PanelFooterProps {
  onInstallFromFile: () => void;
}

export function PanelFooter({ onInstallFromFile }: PanelFooterProps) {
  const { t } = useI18n();

  return (
    <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid var(--border-color)' }}>
      <button
        onClick={onInstallFromFile}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}
      >
        <Download size={12} />
        {t('plugins.installFromFile')}
      </button>
    </div>
  );
}
