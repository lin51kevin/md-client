import { useState, useRef } from 'react';
import { X, Package, Search, Download, Settings, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { usePlugins } from '../hooks/usePlugins';

interface PluginPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function PluginPanel({ visible, onClose }: PluginPanelProps) {
  const { t } = useI18n();
  const { plugins, enablePlugin, disablePlugin, removePlugin, togglePlugin, installFromFile } = usePlugins();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'recommended'>('installed');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleInstall = async () => {
    await installFromFile();
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleRemove = (id: string, name: string) => {
    if (window.confirm(t('plugins.removeConfirm', { name }))) {
      removePlugin(id);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden text-xs select-none"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Hidden file input for fallback install */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
      />

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
            filteredPlugins.map((plugin) => (
              <div key={plugin.id}>
                {/* Plugin card */}
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
                  {/* Expand arrow */}
                  <button
                    onClick={() => toggleExpand(plugin.id)}
                    className="shrink-0 flex items-center justify-center mt-1"
                    style={{ color: 'var(--text-tertiary)', padding: 0 }}
                  >
                    {expandedId === plugin.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  </button>

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
                        v{plugin.version}
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

                  {/* Settings + Enable/Disable */}
                  <div className="shrink-0 flex items-center gap-1 mt-1">
                    <button
                      onClick={() => toggleExpand(plugin.id)}
                      className="flex items-center justify-center"
                      style={{ color: 'var(--text-tertiary)', padding: 2 }}
                      title={t('plugins.detail')}
                    >
                      <Settings size={11} />
                    </button>
                    <button
                      onClick={() => togglePlugin(plugin.id)}
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

                {/* Expanded detail */}
                {expandedId === plugin.id && (
                  <div
                    className="px-3 py-2 mx-2 mb-1 rounded"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {/* Permissions */}
                    <div className="mb-2">
                      <span
                        className="text-[10px] font-medium block mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
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
                          <span
                            className="text-[10px]"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Version + Author */}
                    <div className="flex gap-3 mb-2">
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {t('plugins.version')}: v{plugin.version}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {t('plugins.author')}: {plugin.author}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      {plugin.enabled ? (
                        <button
                          onClick={() => disablePlugin(plugin.id)}
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
                          onClick={() => enablePlugin(plugin.id)}
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
                        onClick={() => handleRemove(plugin.id, plugin.name)}
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
            ))
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
          onClick={handleInstall}
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
