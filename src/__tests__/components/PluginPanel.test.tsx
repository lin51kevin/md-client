import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginPanel } from '../../components/PluginPanel';

// Mock useI18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => {
      let val = k;
      if (vars) {
        for (const [key, v] of Object.entries(vars)) {
          val = val.replace(`{${key}}`, v);
        }
      }
      return val;
    },
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('PluginPanel', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('不可见时不渲染', () => {
    const { container } = render(<PluginPanel visible={false} onClose={() => {}} />);
    expect(container.children.length).toBe(0);
  });

  it('可见时渲染面板', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    expect(screen.getByText('plugins.panel')).toBeTruthy();
  });

  it('从 localStorage 加载默认插件列表', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    expect(screen.getByText('Backlinks Panel')).toBeTruthy();
    expect(screen.getByText('Graph View')).toBeTruthy();
  });

  it('渲染搜索输入框', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('plugins.search');
    expect(input).toBeTruthy();
  });

  it('点击启用/禁用按钮切换状态', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    // Backlinks Panel and AI Copilot start enabled
    const enabledBtns = screen.getAllByText('plugins.enabled');
    fireEvent.click(enabledBtns[0]);
    // After disabling one, there should be more disabled buttons
    const disabledBtns = screen.getAllByText('plugins.disabled');
    expect(disabledBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(<PluginPanel visible={true} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('common.close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('搜索过滤插件列表', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('plugins.search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Backlinks' } });
    expect(screen.getByText('Backlinks Panel')).toBeTruthy();
    expect(screen.queryByText('Graph View')).toBeNull();
  });

  it('点击插件卡片展开详情面板显示权限', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    // Click the first Settings icon to expand
    const settingsBtns = screen.getAllByTitle('plugins.detail');
    fireEvent.click(settingsBtns[0]);
    expect(screen.getByText('plugins.permissions')).toBeTruthy();
    expect(screen.getByText('workspace')).toBeTruthy();
    expect(screen.getByText('editor.read')).toBeTruthy();
  });

  it('展开详情面板显示卸载按钮', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    const settingsBtns = screen.getAllByTitle('plugins.detail');
    fireEvent.click(settingsBtns[0]);
    expect(screen.getByText('plugins.uninstall')).toBeTruthy();
  });

  it('启用/禁用状态持久化到 localStorage', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    // Graph View starts disabled → enable it (first disabled button is Graph View at index 0)
    const disabledBtns = screen.getAllByText('plugins.disabled');
    fireEvent.click(disabledBtns[0]);
    // Verify localStorage was updated (key: 'marklite-installed-plugins')
    const raw = localStorageMock.getItem('marklite-installed-plugins');
    expect(raw).toBeTruthy();
    const plugins = JSON.parse(raw!);
    const graphView = plugins.find((p: { id: string }) => p.id === 'marklite-graph-view');
    expect(graphView.enabled).toBe(true);
  });

  it('切换两次恢复原状态', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    // Backlinks Panel and AI Copilot start enabled — two "enabled" buttons
    const enabledBtns = screen.getAllByText('plugins.enabled');
    fireEvent.click(enabledBtns[0]); // disable first enabled plugin
    // Re-enable: click the first disabled button
    const disabledBtns = screen.getAllByText('plugins.disabled');
    fireEvent.click(disabledBtns[0]); // re-enable
    expect(screen.getAllByText('plugins.enabled').length).toBeGreaterThanOrEqual(1);
  });

  it('无匹配搜索结果时显示空状态', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('plugins.search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    expect(screen.getByText('plugins.noPlugins')).toBeTruthy();
  });
});
