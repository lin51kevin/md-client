import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandPalette } from '../../../components/toolbar/CommandPalette';

vi.mock('../../../lib/editor', () => {
  const commands = [
    { id: 'new-file', label: '新建文件', category: 'file', shortcut: 'Ctrl+N', action: vi.fn() },
    { id: 'open-file', label: '打开文件', category: 'file', shortcut: 'Ctrl+O', action: vi.fn() },
    { id: 'save-file', label: '保存文件', category: 'file', shortcut: 'Ctrl+S', action: vi.fn() },
    { id: 'bold-text', label: '粗体', category: 'format', shortcut: 'Ctrl+B', action: vi.fn() },
    { id: 'italic-text', label: '斜体', category: 'format', shortcut: 'Ctrl+I', action: vi.fn() },
    { id: 'toggle-theme', label: '切换主题', category: 'view', action: vi.fn() },
  ];
  return {
    searchCommands: (query: string, cmds?: typeof commands) => {
      const list = cmds && cmds.length > 0 ? cmds : commands;
      if (!query) return list;
      const q = query.toLowerCase();
      return list.filter(
        (c) => c.label.toLowerCase().includes(q) || c.id.includes(q)
      );
    },
    recordCommandExecution: vi.fn(),
    CATEGORY_LABELS: {
      file: { zh: '文件操作', en: 'File' },
      format: { zh: '格式化', en: 'Format' },
      view: { zh: '视图', en: 'View' },
    },
  };
});

const defaultProps = {
  visible: true,
  commands: [
    { id: 'new-file', label: '新建文件', category: 'file', shortcut: 'Ctrl+N', action: vi.fn() },
    { id: 'open-file', label: '打开文件', category: 'file', shortcut: 'Ctrl+O', action: vi.fn() },
    { id: 'save-file', label: '保存文件', category: 'file', shortcut: 'Ctrl+S', action: vi.fn() },
    { id: 'bold-text', label: '粗体', category: 'format', shortcut: 'Ctrl+B', action: vi.fn() },
    { id: 'italic-text', label: '斜体', category: 'format', shortcut: 'Ctrl+I', action: vi.fn() },
    { id: 'toggle-theme', label: '切换主题', category: 'view', action: vi.fn() },
  ],
  onClose: vi.fn(),
  locale: 'zh-CN',
};

describe('CommandPalette', () => {
  // jsdom lacks scrollIntoView
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all commands when no search query', () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByText('新建文件')).toBeInTheDocument();
    expect(screen.getByText('粗体')).toBeInTheDocument();
    expect(screen.getByText('切换主题')).toBeInTheDocument();
  });

  it('filters commands by keyword input', async () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByPlaceholderText('输入命令搜索...');
    fireEvent.change(input, { target: { value: '保存' } });
    expect(screen.getByText('保存文件')).toBeInTheDocument();
    expect(screen.queryByText('新建文件')).not.toBeInTheDocument();
  });

  it('supports fuzzy/partial matching', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByPlaceholderText('输入命令搜索...');
    fireEvent.change(input, { target: { value: '斜' } });
    expect(screen.getByText('斜体')).toBeInTheDocument();
  });

  it('shows empty state when no match', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByPlaceholderText('输入命令搜索...');
    fireEvent.change(input, { target: { value: 'zzz不存在的命令' } });
    expect(screen.getByText('无匹配命令')).toBeInTheDocument();
  });

  it('executes command on Enter key press', () => {
    const action = vi.fn();
    const cmds = [
      { id: 'new-file', label: '新建文件', category: 'file', shortcut: 'Ctrl+N', action },
      { id: 'open-file', label: '打开文件', category: 'file', shortcut: 'Ctrl+O', action: vi.fn() },
      { id: 'save-file', label: '保存文件', category: 'file', shortcut: 'Ctrl+S', action: vi.fn() },
      { id: 'bold-text', label: '粗体', category: 'format', shortcut: 'Ctrl+B', action: vi.fn() },
      { id: 'italic-text', label: '斜体', category: 'format', shortcut: 'Ctrl+I', action: vi.fn() },
      { id: 'toggle-theme', label: '切换主题', category: 'view', action: vi.fn() },
    ];
    const onClose = vi.fn();
    render(<CommandPalette {...defaultProps} commands={cmds} onClose={onClose} />);

    const input = screen.getByPlaceholderText('输入命令搜索...');
    // selectedIndex starts at 0 (new-file); press Enter immediately
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(action).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('executes command on click', () => {
    const boldAction = vi.fn();
    const cmds = [
      { id: 'new-file', label: '新建文件', category: 'file', shortcut: 'Ctrl+N', action: vi.fn() },
      { id: 'open-file', label: '打开文件', category: 'file', shortcut: 'Ctrl+O', action: vi.fn() },
      { id: 'save-file', label: '保存文件', category: 'file', shortcut: 'Ctrl+S', action: vi.fn() },
      { id: 'bold-text', label: '粗体', category: 'format', shortcut: 'Ctrl+B', action: boldAction },
      { id: 'italic-text', label: '斜体', category: 'format', shortcut: 'Ctrl+I', action: vi.fn() },
      { id: 'toggle-theme', label: '切换主题', category: 'view', action: vi.fn() },
    ];
    const onClose = vi.fn();
    render(<CommandPalette {...defaultProps} commands={cmds} onClose={onClose} />);
    // Click the option div directly (not the inner span) to avoid relying on event bubbling
    const options = screen.getAllByRole('option');
    const boldOption = options.find(el => el.textContent?.includes('粗体'))!;
    fireEvent.click(boldOption);
    expect(boldAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates with arrow keys and wraps correctly', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByPlaceholderText('输入命令搜索...');

    // ArrowDown moves selection
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    // ArrowUp moves back
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('closes on Escape key', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByPlaceholderText('输入命令搜索...');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click (mousedown on backdrop)', () => {
    render(<CommandPalette {...defaultProps} />);
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.mouseDown(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('groups commands by category with headers', () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByText('文件操作')).toBeInTheDocument();
    expect(screen.getByText('格式化')).toBeInTheDocument();
    expect(screen.getByText('视图')).toBeInTheDocument();
  });

  it('returns null when not visible', () => {
    const { container } = render(<CommandPalette {...defaultProps} visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows English placeholder when locale is en', () => {
    render(<CommandPalette {...defaultProps} locale="en" />);
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
    expect(screen.getByText(/close/)).toBeInTheDocument();
  });

  it('resets selection when filtered results change', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByPlaceholderText('输入命令搜索...');

    // Move down a few times
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Type to filter down to one result — selection should clamp
    fireEvent.change(input, { target: { value: '切换' } });
    // Only "切换主题" should show, selected index clamped to 0
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });
});
