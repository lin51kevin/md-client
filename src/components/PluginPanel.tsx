import { useState, useRef, useMemo } from 'react';
import { X, Package, Search, Download } from 'lucide-react';
import { useI18n } from '../i18n';
import { usePlugins } from '../hooks/usePlugins';
import { getOfficialPlugins } from '../plugins/registry/registry-client';
import { readRegistryManifest } from '../plugins/registry/quick-install';
import { PluginCard } from './PluginPanel/PluginCard';
import { RegistryCard } from './PluginPanel/RegistryCard';

interface PluginPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function PluginPanel({ visible, onClose }: PluginPanelProps) {
  const { t } = useI18n();
  const { plugins, enablePlugin, disablePlugin, removePlugin, togglePlugin, installFromFile, addPluginFromManifest } = usePlugins();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'recommended'>('installed');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const installedIds = useMemo(() => new Set(plugins.map((p) => p.id)), [plugins]);

  const registryPlugins = useMemo(() => {
    const list = getOfficialPlugins();
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [searchQuery]);
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

  const handleRegistryInstall = async (plugin: Parameters<typeof readRegistryManifest>[0]) => {
    if (installingId === plugin.id) return;
    setInstallingId(plugin.id);
    try {
      const manifest = await readRegistryManifest(plugin);
      if (manifest) {
        addPluginFromManifest(manifest);
      }
    } finally {
      setInstallingId(null);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden text-xs select-none"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
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
            <div className="px-3 py-4 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {t('plugins.noPlugins')}
            </div>
          ) : (
            filteredPlugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                expanded={expandedId === plugin.id}
                onToggleExpand={() => toggleExpand(plugin.id)}
                onToggleEnable={togglePlugin}
                onEnable={enablePlugin}
                onDisable={disablePlugin}
                onRemove={handleRemove}
              />
            ))
          )
        ) : (
          registryPlugins.length === 0 ? (
            <div className="px-3 py-8 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {t('plugins.noPlugins')}
            </div>
          ) : (
            registryPlugins.map((rp) => (
              <RegistryCard
                key={rp.id}
                plugin={rp}
                installed={installedIds.has(rp.id)}
                installing={installingId === rp.id}
                onInstall={handleRegistryInstall}
              />
            ))
          )
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid var(--border-color)' }}>
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
