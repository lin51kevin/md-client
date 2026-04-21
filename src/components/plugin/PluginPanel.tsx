import { useState, useRef, useMemo } from 'react';
import { usePlugins } from '../../hooks/usePlugins';
import { getOfficialPlugins } from '../../plugins/registry/registry-client';
import type { RegistryPluginEntry } from '../../plugins/registry/registry-client';
import { readRegistryManifest } from '../../plugins/registry/quick-install';
import { PanelHeader } from './PanelHeader';
import { SearchBar } from './SearchBar';
import { TabSwitcher } from './TabSwitcher';
import { PluginList } from './PluginList';
import { PanelFooter } from './PanelFooter';

interface PluginPanelProps {
  visible: boolean;
  onClose: () => void;
  onActivate?: (id: string) => Promise<void>;
  onDeactivate?: (id: string) => Promise<void>;
}

export function PluginPanel({ visible, onClose, onActivate, onDeactivate }: PluginPanelProps) {
  const { plugins, enablePlugin, disablePlugin, removePlugin, togglePlugin, installFromFile, addPluginFromManifest } = usePlugins({
    onActivate,
    onDeactivate,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'recommended'>('installed');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleRemove = (id: string, name: string) => {
    if (window.confirm(`Remove ${name}?`)) {
      removePlugin(id);
    }
  };

  const handleRegistryInstall = async (plugin: RegistryPluginEntry) => {
    if (installingId === plugin.id) return;
    setInstallingId(plugin.id);
    try {
      // Fetch the full manifest to get declared permissions so the approval
      // dialog is shown when the plugin requests sensitive capabilities.
      const fullManifest = await readRegistryManifest(plugin);
      addPluginFromManifest({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        author: plugin.author,
        description: plugin.description,
        permissions: fullManifest?.permissions ?? [],
      });
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
      <PanelHeader onClose={onClose} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
      <div className="flex-1 overflow-y-auto py-1">
        <PluginList
          activeTab={activeTab}
          filteredPlugins={filteredPlugins}
          registryPlugins={registryPlugins}
          installedIds={installedIds}
          installingId={installingId}
          expandedId={expandedId}
          onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
          onToggleEnable={togglePlugin}
          onEnable={enablePlugin}
          onDisable={disablePlugin}
          onRemove={handleRemove}
          onRegistryInstall={handleRegistryInstall}
        />
      </div>
      <PanelFooter onInstallFromFile={installFromFile} />
    </div>
  );
}
