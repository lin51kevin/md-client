import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../../components/SettingsModal';
import type { ThemeName } from '../../lib/theme';

// Mock image-paste module to avoid localStorage issues
vi.mock('../../lib/image-paste', () => ({
  getImageSaveDir: () => '',
  setImageSaveDir: vi.fn(),
}));

describe('ShortcutSettings', () => {
  const defaultProps = {
    visible: true,
    onClose: vi.fn(),
    currentTheme: 'light' as ThemeName,
    onThemeChange: vi.fn(),
    spellCheck: true,
    onSpellCheckChange: vi.fn(),
    vimMode: false,
    onVimModeChange: vi.fn(),
    autoSave: false,
    onAutoSaveChange: vi.fn(),
    autoSaveDelay: 1000,
    onAutoSaveDelayChange: vi.fn(),
    gitMdOnly: false,
    onGitMdOnlyChange: vi.fn(),
    milkdownPreview: true,
    onMilkdownPreviewChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Shortcuts Tab Rendering', () => {
    it('should render shortcuts tab in sidebar', () => {
      render(<SettingsModal {...defaultProps} />);

      // The shortcuts tab should exist in the sidebar
      expect(screen.getByText('快捷键')).toBeInTheDocument();
    });

    it('should switch to shortcuts tab when clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      // Click the shortcuts tab
      fireEvent.click(screen.getByText('快捷键'));

      // Should show shortcut items
      expect(screen.getByText('新建标签页')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    });

    it('should display all default keyboard shortcuts', () => {
      render(<SettingsModal {...defaultProps} />);

      // Click the shortcuts tab first
      fireEvent.click(screen.getByText('快捷键'));

      // Check for all expected shortcut entries
      const shortcuts = [
        { action: '新建标签页', key: 'Ctrl+N' },
        { action: '打开文件', key: 'Ctrl+O' },
        { action: '保存文件', key: 'Ctrl+S' },
        { action: '另存为', key: 'Ctrl+Shift+S' },
        { action: '关闭标签页', key: 'Ctrl+W' },
        { action: '查找与替换', key: 'Ctrl+F' },
        { action: '仅编辑模式', key: 'Ctrl+1' },
        { action: '分栏模式', key: 'Ctrl+2' },
        { action: '仅预览模式', key: 'Ctrl+3' },
        { action: '打字机模式', key: 'Ctrl+.' },
        { action: '专注模式', key: 'Ctrl+,' },
      ];

      for (const sc of shortcuts) {
        expect(screen.getByText(sc.action)).toBeInTheDocument();
        expect(screen.getByText(sc.key)).toBeInTheDocument();
      }
    });
  });
});

describe('SettingsModal — Editor Tab', () => {
  const makeProps = (overrides: Record<string, unknown> = {}) => ({
    visible: true,
    onClose: vi.fn(),
    currentTheme: 'light' as ThemeName,
    onThemeChange: vi.fn(),
    spellCheck: true,
    onSpellCheckChange: vi.fn(),
    vimMode: false,
    onVimModeChange: vi.fn(),
    autoSave: false,
    onAutoSaveChange: vi.fn(),
    autoSaveDelay: 1000,
    onAutoSaveDelayChange: vi.fn(),
    ...overrides,
  });

  const openEditorTab = () => {
    fireEvent.click(screen.getByText(/编辑器|Editor/));
  };

  it('编辑器选项卡包含自动保存开关', () => {
    render(<SettingsModal {...makeProps()} />);
    openEditorTab();
    // label text exactly matches the i18n key value (not the description)
    expect(screen.getAllByText(/自动保存|Auto Save/).length).toBeGreaterThanOrEqual(1);
  });

  it('自动保存关闭时不显示延时选项', () => {
    render(<SettingsModal {...makeProps({ autoSave: false })} />);
    openEditorTab();
    expect(screen.queryByText('自动保存延时')).toBeNull();
    expect(screen.queryByText('Auto Save Delay')).toBeNull();
  });

  it('自动保存开启时显示延时选项', () => {
    render(<SettingsModal {...makeProps({ autoSave: true })} />);
    openEditorTab();
    const delayLabel = screen.queryByText('自动保存延时') ?? screen.queryByText('Auto Save Delay');
    expect(delayLabel).toBeTruthy();
  });

  it('延时选择器包含 1s/2s/5s/自定义选项', () => {
    render(<SettingsModal {...makeProps({ autoSave: true })} />);
    openEditorTab();
    const select = screen.getAllByRole('combobox').find(s =>
      s.querySelector('option[value="1000"]')
    );
    expect(select).toBeDefined();
    expect(select!.querySelector('option[value="1000"]')).toBeTruthy();
    expect(select!.querySelector('option[value="2000"]')).toBeTruthy();
    expect(select!.querySelector('option[value="5000"]')).toBeTruthy();
    expect(select!.querySelector('option[value="custom"]')).toBeTruthy();
  });

  it('切换延时触发 onAutoSaveDelayChange', () => {
    const onDelayChange = vi.fn();
    render(<SettingsModal {...makeProps({ autoSave: true, onAutoSaveDelayChange: onDelayChange })} />);
    openEditorTab();
    const select = screen.getAllByRole('combobox').find(s =>
      s.querySelector('option[value="2000"]')
    )!;
    fireEvent.change(select, { target: { value: '2000' } });
    expect(onDelayChange).toHaveBeenCalledWith(2000);
  });

  it('自定义延时选项显示数字输入框', () => {
    // autoSaveDelay=3000 不在预设值中 → 选择器显示 custom + 输入框
    render(<SettingsModal {...makeProps({ autoSave: true, autoSaveDelay: 3000 })} />);
    openEditorTab();
    const input = document.querySelector('input[type="number"]');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('3000');
  });

  it('自定义输入框失焦触发 onAutoSaveDelayChange（有效值）', () => {
    const onDelayChange = vi.fn();
    render(<SettingsModal {...makeProps({ autoSave: true, autoSaveDelay: 3000, onAutoSaveDelayChange: onDelayChange })} />);
    openEditorTab();
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '4000' } });
    fireEvent.blur(input);
    expect(onDelayChange).toHaveBeenCalledWith(4000);
  });
});
