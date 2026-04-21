import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortcutsTab } from '../../../../components/modal/settings/ShortcutsTab';

describe('ShortcutsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of shortcut entries', () => {
    render(<ShortcutsTab />);
    expect(screen.getByText('新建标签页')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
  });

  it('renders multiple shortcut entries', () => {
    render(<ShortcutsTab />);
    expect(screen.getByText('打开文件')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
    expect(screen.getByText('保存文件')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ShortcutsTab />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('search filters shortcut list', () => {
    render(<ShortcutsTab />);
    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: '新建' } });
    expect(screen.getByText('新建标签页')).toBeInTheDocument();
    expect(screen.queryByText('打开文件')).not.toBeInTheDocument();
  });

  it('renders category filter buttons', () => {
    render(<ShortcutsTab />);
    // "全部" category button should always exist
    expect(screen.getByText(/全部|All/)).toBeInTheDocument();
  });

  it('clicking a shortcut kbd puts it in editing state', () => {
    render(<ShortcutsTab />);
    // Click the first kbd element (shortcut key display)
    const kbdElements = document.querySelectorAll('kbd');
    if (kbdElements.length > 0) {
      fireEvent.click(kbdElements[0]);
      // After click, editing mode hint should appear
      expect(screen.getByText(/按下新的快捷键|Press new key/)).toBeInTheDocument();
    }
  });

  it('shows no-results message when search yields nothing', () => {
    render(<ShortcutsTab />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xyznotexist999' } });
    expect(screen.getByText(/无匹配结果|未找到|No results/)).toBeInTheDocument();
  });
});
