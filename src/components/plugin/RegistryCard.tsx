import { Package, Tag } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { RegistryPluginEntry } from '../../plugins/registry/registry-client';

interface RegistryCardProps {
  plugin: RegistryPluginEntry;
  installed: boolean;
  installing: boolean;
  onInstall: (plugin: RegistryPluginEntry) => void;
}

export function RegistryCard({ plugin, installed, installing, onInstall }: RegistryCardProps) {
  const { t } = useI18n();

  return (
    <div
      className="group flex items-start gap-2 px-3 py-2 transition-colors"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center rounded mt-0.5"
        style={{
          width: 32,
          height: 32,
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
      >
        <Package size={16} strokeWidth={1.4} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {plugin.name}
          </span>
          <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            v{plugin.version}
          </span>
          {installed && (
            <span
              className="shrink-0 px-1.5 py-0 rounded text-[9px]"
              style={{
                backgroundColor: 'rgba(34,134,58,0.12)',
                color: '#22863a',
                border: '1px solid rgba(34,134,58,0.3)',
              }}
            >
              {t('plugins.installed')}
            </span>
          )}
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {plugin.author}
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {plugin.description}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {plugin.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 px-1 py-0 rounded text-[9px]"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Tag size={8} />
              {tag}
            </span>
          ))}
        </div>
      </div>
      {!installed && (
        <button
          onClick={() => onInstall(plugin)}
          disabled={installing}
          className="shrink-0 px-2 py-0.5 rounded text-[10px] transition-colors"
          style={{
            backgroundColor: installing ? 'var(--bg-tertiary)' : 'rgba(9,105,218,0.12)',
            border: installing ? '1px solid var(--border-color)' : '1px solid rgba(9,105,218,0.3)',
            color: installing ? 'var(--text-tertiary)' : '#0969da',
          }}
        >
          {installing ? '...' : t('plugins.install')}
        </button>
      )}
    </div>
  );
}
