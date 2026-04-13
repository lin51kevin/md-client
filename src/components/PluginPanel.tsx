import { useState } from 'react';
import { X, Package, Search, Download } from 'lucide-react';
import { useI18n } from '../i18n';

interface PluginPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface PluginItem {
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
}

const MOCK_PLUGINS: PluginItem[] = [
  {
    name: 'Backlinks Panel',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '显示当前文档的反向链接',
    enabled: true,
  },
  {
    name: 'Graph View',
    version: '1.0.0',
    author: 'MarkLite Team',
    description: '双向链接知识图谱可视化',
    enabled: false,
  },
];

export function PluginPanel({ visible, onClose }: PluginPanelProps) {
  const { t } = useI18n();
  const [plugins, setPlugins] = useState<PluginItem[]>(MOCK_PLUGINS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'recommended'>('installed');

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const togglePlugin = (index: number) => {
    setPlugins((prev) =>
      prev.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p)),
    );
  };

  if (!visible) return null;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden text-xs select-none"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Header */}
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

      {/* Search */}
      <div className="shrink-0 px-2 py-1.5">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Search size={12} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('plugins.search')}
            className="w-full text-xs bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="shrink-0 flex px-2 gap-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <button
          onClick={() => setActiveTab('installed')}
          className="px-3 py-1.5 text-xs transition-colors"
          style={{
            color: activeTab === 'installed' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom:
              activeTab === 'installed' ? '2px solid var(--accent-color)' : '2px solid transparent',
          }}
        >
          {t('plugins.installed')}
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className="px-3 py-1.5 text-xs transition-colors"
          style={{
            color: activeTab === 'recommended' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom:
              activeTab === 'recommended' ? '2px solid var(--accent-color)' : '2px solid transparent',
          }}
        >
          {t('plugins.recommended')}
        </button>
      </div>

      {/* Plugin list */}
      <div className="flex-1 overflow-y-auto py-1">
        {activeTab === 'installed' ? (
          filteredPlugins.length === 0 ? (
            <div
              className="px-3 py-4 text-center text-[10px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('plugins.noPlugins')}
            </div>
          ) : (
            filteredPlugins.map((plugin) => {
              const realIndex = plugins.indexOf(plugin);
              return (
                <div
                  key={plugin.name}
                  className="group flex items-start gap-2 px-3 py-2 transition-colors"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Icon */}
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
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {plugin.name}
                      </span>
                      <span
                        className="shrink-0 text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {plugin.version}
                      </span>
                    </div>
                    <div
                      className="text-[10px] truncate mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {plugin.author}
                    </div>
                    <div
                      className="text-[10px] truncate mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {plugin.description}
                    </div>
                  </div>
                  {/* Enable/Disable button */}
                  <button
                    onClick={() => togglePlugin(realIndex)}
                    className="shrink-0 px-1.5 py-0.5 rounded text-[10px] transition-colors mt-1"
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
              );
            })
          )
        ) : (
          <div
            className="px-3 py-8 text-center text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('plugins.noPlugins')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-3 py-2"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <button
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
    </div>
  );
}
