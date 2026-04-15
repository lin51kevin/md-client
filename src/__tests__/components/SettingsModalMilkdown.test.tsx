import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../../components/SettingsModal';
import type { ThemeName } from '../../lib/theme';

vi.mock('../../lib/image-paste', () => ({
  getImageSaveDir: () => '',
  setImageSaveDir: vi.fn(),
}));

const baseProps = {
  visible: true,
  onClose: vi.fn(),
  currentTheme: 'light' as ThemeName,
  onThemeChange: vi.fn(),
  spellCheck: false,
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

/** Navigate to the Editor tab and return the milkdownPreview toggle button. */
function getMilkdownToggle(): HTMLButtonElement {
  fireEvent.click(screen.getByText(/Editor|编辑器/));
  const label = screen.getByText(/预览窗口可编辑|Editable Preview/);
  const item = label.closest('div.flex') as HTMLElement;
  return item.querySelector('button[role="switch"]') as HTMLButtonElement;
}

describe('SettingsModal — milkdownPreview toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the milkdownPreview label in the Editor tab', () => {
    render(<SettingsModal {...baseProps} />);
    fireEvent.click(screen.getByText(/Editor|编辑器/));
    expect(screen.getByText(/预览窗口可编辑|Editable Preview/)).toBeInTheDocument();
  });

  it('toggle is aria-checked="true" when milkdownPreview=true', () => {
    render(<SettingsModal {...baseProps} milkdownPreview={true} />);
    const toggle = getMilkdownToggle();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('toggle is aria-checked="false" when milkdownPreview=false', () => {
    render(<SettingsModal {...baseProps} milkdownPreview={false} />);
    const toggle = getMilkdownToggle();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('calls onMilkdownPreviewChange(false) when toggled off', () => {
    const onMilkdownPreviewChange = vi.fn();
    render(
      <SettingsModal
        {...baseProps}
        milkdownPreview={true}
        onMilkdownPreviewChange={onMilkdownPreviewChange}
      />
    );
    fireEvent.click(getMilkdownToggle());
    expect(onMilkdownPreviewChange).toHaveBeenCalledWith(false);
  });

  it('calls onMilkdownPreviewChange(true) when toggled on', () => {
    const onMilkdownPreviewChange = vi.fn();
    render(
      <SettingsModal
        {...baseProps}
        milkdownPreview={false}
        onMilkdownPreviewChange={onMilkdownPreviewChange}
      />
    );
    fireEvent.click(getMilkdownToggle());
    expect(onMilkdownPreviewChange).toHaveBeenCalledWith(true);
  });

  it('description text is shown alongside the toggle', () => {
    render(<SettingsModal {...baseProps} />);
    fireEvent.click(screen.getByText(/Editor|编辑器/));
    expect(
      screen.getByText(/Milkdown|milkdown|只读预览|read-only preview/i)
    ).toBeInTheDocument();
  });
});
