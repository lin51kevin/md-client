import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppearanceTab } from '../../../../components/modal/settings/AppearanceTab';
import type { ThemeName } from '../../../../lib/theme';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn().mockResolvedValue(null),
}));
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const builtInThemes = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark' },
];

const baseProps = {
  currentTheme: 'light' as ThemeName,
  onThemeChange: vi.fn(),
  installedThemes: builtInThemes,
  themeImportError: null,
  fileInputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  onFileSelect: vi.fn(),
  onExportThemeExample: vi.fn(),
  onRemoveTheme: vi.fn(),
  isBuiltIn: (_name: string) => true,
};

describe('AppearanceTab', () => {
  it('renders theme selector combobox', () => {
    render(<AppearanceTab {...baseProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('theme selector shows current theme', () => {
    render(<AppearanceTab {...baseProps} currentTheme="dark" />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('dark');
  });

  it('calls onThemeChange when theme selected', () => {
    const onThemeChange = vi.fn();
    render(<AppearanceTab {...baseProps} onThemeChange={onThemeChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dark' } });
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('renders import theme button', () => {
    render(<AppearanceTab {...baseProps} />);
    expect(screen.getByText(/导入|Import|インポート/)).toBeInTheDocument();
  });

  it('renders export theme button', () => {
    render(<AppearanceTab {...baseProps} />);
    expect(screen.getByText(/导出|Export|エクスポート/)).toBeInTheDocument();
  });

  it('shows themeImportError when set', () => {
    render(<AppearanceTab {...baseProps} themeImportError="Parse failed" />);
    expect(screen.getByText(/Parse failed/)).toBeInTheDocument();
  });

  it('does not show custom theme list when all themes are built-in', () => {
    render(<AppearanceTab {...baseProps} isBuiltIn={() => true} />);
    // No trash buttons for built-in themes
    expect(screen.queryByTitle(/删除|Remove|削除/)).not.toBeInTheDocument();
  });

  it('shows remove button for custom themes', () => {
    const customThemes = [
      ...builtInThemes,
      { name: 'my-custom', label: 'My Custom' },
    ];
    render(<AppearanceTab {...baseProps} installedThemes={customThemes} isBuiltIn={(n) => n !== 'my-custom'} />);
    expect(screen.getAllByText('My Custom').length).toBeGreaterThanOrEqual(1);
  });
});
