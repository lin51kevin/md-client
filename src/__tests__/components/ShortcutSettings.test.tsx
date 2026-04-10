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
