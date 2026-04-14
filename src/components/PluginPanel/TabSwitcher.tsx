import { useI18n } from '../../i18n';

interface TabSwitcherProps {
  activeTab: 'installed' | 'recommended';
  onChange: (tab: 'installed' | 'recommended') => void;
}

export function TabSwitcher({ activeTab, onChange }: TabSwitcherProps) {
  const { t } = useI18n();

  const tabs: Array<{ key: 'installed' | 'recommended'; label: string }> = [
    { key: 'installed', label: t('plugins.installed') },
    { key: 'recommended', label: t('plugins.recommended') },
  ];

  return (
    <div
      className="shrink-0 flex px-2 gap-0"
      style={{ borderBottom: '1px solid var(--border-color)' }}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="px-3 py-1.5 text-xs transition-colors"
          style={{
            color: activeTab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom:
              activeTab === key ? '2px solid var(--accent-color)' : '2px solid transparent',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
