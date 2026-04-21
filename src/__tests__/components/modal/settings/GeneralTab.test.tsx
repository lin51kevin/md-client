import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeneralTab } from '../../../../components/modal/settings/GeneralTab';

const baseProps = {
  locale: 'zh-CN' as const,
  setLocale: vi.fn(),
  autoUpdateCheck: true,
  onAutoUpdateCheckChange: vi.fn(),
  updateCheckFrequency: '24h' as const,
  onUpdateCheckFrequencyChange: vi.fn(),
  contextMenuIntegration: false,
  onContextMenuIntegrationChange: vi.fn(),
  isWindows: false,
};

describe('GeneralTab', () => {
  it('renders language selector', () => {
    render(<GeneralTab {...baseProps} autoUpdateCheck={false} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('language selector has current locale selected', () => {
    render(<GeneralTab {...baseProps} autoUpdateCheck={false} locale="zh-CN" />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('zh-CN');
  });

  it('calls setLocale when language changed', () => {
    const setLocale = vi.fn();
    render(<GeneralTab {...baseProps} autoUpdateCheck={false} setLocale={setLocale} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    expect(setLocale).toHaveBeenCalledWith('en');
  });

  it('renders auto-update toggle', () => {
    render(<GeneralTab {...baseProps} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('auto-update toggle is on when autoUpdateCheck=true', () => {
    render(<GeneralTab {...baseProps} autoUpdateCheck={true} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onAutoUpdateCheckChange when toggle clicked', () => {
    const onAutoUpdateCheckChange = vi.fn();
    render(<GeneralTab {...baseProps} onAutoUpdateCheckChange={onAutoUpdateCheckChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onAutoUpdateCheckChange).toHaveBeenCalledWith(false);
  });

  it('hides context menu setting on non-Windows', () => {
    render(<GeneralTab {...baseProps} isWindows={false} />);
    expect(screen.queryByText(/右键菜单|Context Menu|コンテキストメニュー/)).not.toBeInTheDocument();
  });

  it('shows context menu setting on Windows', () => {
    render(<GeneralTab {...baseProps} isWindows={true} />);
    // Should render context menu toggle (one more switch)
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });
});
