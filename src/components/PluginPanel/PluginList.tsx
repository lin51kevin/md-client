import type { PluginUIItem } from '../../hooks/usePlugins';
import type { RegistryPluginEntry } from '../../plugins/registry/registry-client';
import { useI18n } from '../../i18n';
import { PluginCard } from './PluginCard';
import { RegistryCard } from './RegistryCard';

interface PluginListProps {
  activeTab: 'installed' | 'recommended';
  filteredPlugins: PluginUIItem[];
  registryPlugins: RegistryPluginEntry[];
  installedIds: Set<string>;
  installingId: string | null;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleEnable: (id: string) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onRemove: (id: string, name: string) => void;
  onRegistryInstall: (plugin: RegistryPluginEntry) => void;
}

export function PluginList({
  activeTab,
  filteredPlugins,
  registryPlugins,
  installedIds,
  installingId,
  expandedId,
  onToggleExpand,
  onToggleEnable,
  onEnable,
  onDisable,
  onRemove,
  onRegistryInstall,
}: PluginListProps) {
  const { t } = useI18n();

  if (activeTab === 'installed') {
    if (filteredPlugins.length === 0) {
      return (
        <div className="px-3 py-4 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {t('plugins.noPlugins')}
        </div>
      );
    }
    return (
      <>
        {filteredPlugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            expanded={expandedId === plugin.id}
            onToggleExpand={() => onToggleExpand(plugin.id)}
            onToggleEnable={onToggleEnable}
            onEnable={onEnable}
            onDisable={onDisable}
            onRemove={onRemove}
          />
        ))}
      </>
    );
  }

  if (registryPlugins.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        {t('plugins.noPlugins')}
      </div>
    );
  }

  return (
    <>
      {registryPlugins.map((rp) => (
        <RegistryCard
          key={rp.id}
          plugin={rp}
          installed={installedIds.has(rp.id)}
          installing={installingId === rp.id}
          onInstall={onRegistryInstall}
        />
      ))}
    </>
  );
}
