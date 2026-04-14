import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useI18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
  }),
}));

// Mock PluginCard and RegistryCard
vi.mock('../../components/PluginPanel/PluginCard', () => ({
  PluginCard: ({ plugin, expanded }: any) => (
    <div data-testid="plugin-card">{plugin.name} {expanded ? '(expanded)' : ''}</div>
  ),
}));

vi.mock('../../components/PluginPanel/RegistryCard', () => ({
  RegistryCard: ({ plugin, installed, installing }: any) => (
    <div data-testid="registry-card">{plugin.name} {installed ? '(installed)' : ''} {installing ? '(installing)' : ''}</div>
  ),
}));

const defaultProps = {
  activeTab: 'installed' as const,
  filteredPlugins: [
    { id: 'p1', name: 'Plugin 1', enabled: true, expanded: false },
    { id: 'p2', name: 'Plugin 2', enabled: false, expanded: false },
  ],
  registryPlugins: [
    { id: 'r1', name: 'Registry 1', version: '1.0.0', description: '', author: '', tags: [], manifestUrl: '' },
  ],
  installedIds: new Set(['r1']),
  installingId: null,
  expandedId: null,
  onToggleExpand: vi.fn(),
  onToggleEnable: vi.fn(),
  onEnable: vi.fn(),
  onDisable: vi.fn(),
  onRemove: vi.fn(),
  onRegistryInstall: vi.fn(),
};

describe('PluginList', () => {
  it('shows installed plugins when activeTab is installed', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    render(<PluginList {...defaultProps} />);
    expect(screen.getByText('Plugin 1')).toBeTruthy();
    expect(screen.getByText('Plugin 2')).toBeTruthy();
  });

  it('shows empty message when no installed plugins', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    render(<PluginList {...defaultProps} filteredPlugins={[]} />);
    expect(screen.getByText('plugins.noPlugins')).toBeTruthy();
  });

  it('shows registry plugins when activeTab is recommended', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    render(<PluginList {...defaultProps} activeTab="recommended" />);
    expect(screen.getByText(/Registry 1/)).toBeTruthy();
    expect(screen.getByTestId('registry-card')).toBeTruthy();
  });

  it('shows empty message when no registry plugins', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    render(<PluginList {...defaultProps} activeTab="recommended" registryPlugins={[]} />);
    expect(screen.getByText('plugins.noPlugins')).toBeTruthy();
  });

  it('passes installing state to RegistryCard', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    render(<PluginList {...defaultProps} activeTab="recommended" installingId="r1" />);
    expect(screen.getByText(/installing/)).toBeTruthy();
  });

  it('marks installed registry plugins', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    render(<PluginList {...defaultProps} activeTab="recommended" />);
    expect(screen.getByText(/installed/)).toBeTruthy();
  });

  it('handles single installed plugin', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    render(<PluginList {...defaultProps} filteredPlugins={[defaultProps.filteredPlugins[0]]} />);
    expect(screen.getAllByTestId('plugin-card')).toHaveLength(1);
  });

  it('handles many registry plugins', async () => {
    const { PluginList } = await import('../../components/PluginPanel/PluginList');
    const manyPlugins = Array.from({ length: 20 }, (_, i) => ({
      id: `r${i}`, name: `Registry ${i}`, version: '1.0.0',
      description: '', author: '', tags: [], manifestUrl: '',
    }));
    render(<PluginList {...defaultProps} activeTab="recommended" registryPlugins={manyPlugins} />);
    expect(screen.getAllByTestId('registry-card')).toHaveLength(20);
  });
});
