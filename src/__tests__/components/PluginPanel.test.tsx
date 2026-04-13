import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginPanel } from '../../components/PluginPanel';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

describe('PluginPanel', () => {
  it('不可见时不渲染', () => {
    const { container } = render(<PluginPanel visible={false} onClose={() => {}} />);
    expect(container.children.length).toBe(0);
  });

  it('可见时渲染面板', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    expect(screen.getByText('plugins.panel')).toBeTruthy();
  });

  it('渲染搜索输入框', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('plugins.search');
    expect(input).toBeTruthy();
  });

  it('渲染 Tab 栏（已安装 + 推荐）', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    expect(screen.getByText('plugins.installed')).toBeTruthy();
    expect(screen.getByText('plugins.recommended')).toBeTruthy();
  });

  it('渲染 mock 插件列表', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    expect(screen.getByText('Backlinks Panel')).toBeTruthy();
    expect(screen.getByText('Graph View')).toBeTruthy();
  });

  it('点击启用/禁用按钮切换状态', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    // Backlinks Panel starts enabled → click to disable
    const backlinksBtn = screen.getByText('plugins.disable');
    fireEvent.click(backlinksBtn);
    expect(screen.getByText('plugins.enable')).toBeTruthy();
    // Graph View starts disabled → click to enable
    const graphBtn = screen.getByText('plugins.enable');
    fireEvent.click(graphBtn);
    expect(screen.getByText('plugins.disable')).toBeTruthy();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(<PluginPanel visible={true} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('common.close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('搜索输入框可以输入文本', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('plugins.search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'backlinks' } });
    expect(input.value).toBe('backlinks');
  });

  it('搜索过滤插件列表', () => {
    render(<PluginPanel visible={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('plugins.search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Backlinks' } });
    expect(screen.getByText('Backlinks Panel')).toBeTruthy();
    expect(screen.queryByText('Graph View')).toBeNull();
  });
});
