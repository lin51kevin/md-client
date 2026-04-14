import { Package, ChevronDown, ChevronRight, Settings, Trash2 } from 'lucide-react';
import type { PluginUIItem } from '../../hooks/usePlugins';
import { useI18n } from '../../i18n';

interface PluginCardProps {
  plugin: PluginUIItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleEnable: (id: string) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onRemove: (id: string, name: string) => void;
}

export function PluginCard({
  plugin,
  expanded,
  onToggleExpand,
  onToggleEnable,
  onEnable,
  onDisable,
  onRemove,
}: PluginCardProps) {
  const { t } = useI18n();

  return (
    <div>
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
        <button
          onClick={onToggleExpand}
          className="shrink-0 flex items-center justify-center mt-1"
          style={{ color: 'var(--text-tertiary)', padding: 0 }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>

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
          </div>
          <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {plugin.author}
          </div>
          <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {plugin.description}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1 mt-1">
          <button
            onClick={onToggleExpand}
            className="flex items-center justify-center"
            style={{ color: 'var(--text-tertiary)', padding: 2 }}
            title={t('plugins.detail')}
          >
            <Settings size={11} />
          </button>
          <button
            onClick={() => onToggleEnable(plugin.id)}
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] transition-colors"
            style={{
              backgroundColor: plugin.enabled
                ? 'rgba(34,134,58,0.12)'
                : 'var(--bg-tertiary)',
              color: plugin.enabled ? '#22863a' : 'var(--text-tertiary)',
              border: plugin.enabled
                ? '1px solid rgba(34,134,58,0.3)'
                : '1px solid var(--border-color)',
            }}
          >
            {plugin.enabled ? t('plugins.enabled') : t('plugins.disabled')}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="px-3 py-2 mx-2 mb-1 rounded"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="mb-2">
            <span className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('plugins.permissions')}
            </span>
            <div className="flex flex-wrap gap-1">
              {plugin.permissions.length > 0 ? (
                plugin.permissions.map((p) => (
                  <span
                    key={p}
                    className="px-1.5 py-0.5 rounded text-[9px]"
                    style={{
                      backgroundColor: 'rgba(9,105,218,0.1)',
                      color: '#0969da',
                      border: '1px solid rgba(9,105,218,0.2)',
                    }}
                  >
                    {p}
                  </span>
                ))
              ) : (
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  —
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 mb-2">
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {t('plugins.version')}: v{plugin.version}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {t('plugins.author')}: {plugin.author}
            </span>
          </div>

          <div className="flex gap-1.5">
            {plugin.enabled ? (
              <button
                onClick={() => onDisable(plugin.id)}
                className="px-2 py-0.5 rounded text-[10px] transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('plugins.disable')}
              </button>
            ) : (
              <button
                onClick={() => onEnable(plugin.id)}
                className="px-2 py-0.5 rounded text-[10px] transition-colors"
                style={{
                  backgroundColor: 'rgba(34,134,58,0.12)',
                  border: '1px solid rgba(34,134,58,0.3)',
                  color: '#22863a',
                }}
              >
                {t('plugins.enable')}
              </button>
            )}
            <button
              onClick={() => onRemove(plugin.id, plugin.name)}
              className="px-2 py-0.5 rounded text-[10px] transition-colors"
              style={{
                backgroundColor: 'rgba(203,36,49,0.08)',
                border: '1px solid rgba(203,36,49,0.2)',
                color: '#cb2431',
              }}
            >
              <span className="flex items-center gap-0.5">
                <Trash2 size={9} />
                {t('plugins.uninstall')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
