import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTab } from '../../../../components/modal/settings/EditorTab';

const baseProps = {
  autoSave: false,
  onAutoSaveChange: vi.fn(),
  autoSaveDelay: 1000,
  onAutoSaveDelayChange: vi.fn(),
  fileWatch: false,
  onFileWatchChange: vi.fn(),
  fileWatchBehavior: false,
  onFileWatchBehaviorChange: vi.fn(),
  typewriterOptions: undefined,
  onTypewriterOptionsChange: undefined,
};

describe('EditorTab', () => {
  it('renders auto-save toggle', () => {
    render(<EditorTab {...baseProps} />);
    expect(screen.getAllByRole('switch').length).toBeGreaterThanOrEqual(1);
  });

  it('auto-save toggle is off when autoSave=false', () => {
    render(<EditorTab {...baseProps} autoSave={false} />);
    const [autoSaveSwitch] = screen.getAllByRole('switch');
    expect(autoSaveSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onAutoSaveChange(true) when toggled on', () => {
    const onAutoSaveChange = vi.fn();
    render(<EditorTab {...baseProps} onAutoSaveChange={onAutoSaveChange} />);
    fireEvent.click(screen.getAllByRole('switch')[0]);
    expect(onAutoSaveChange).toHaveBeenCalledWith(true);
  });

  it('hides delay selector when autoSave=false', () => {
    render(<EditorTab {...baseProps} autoSave={false} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows delay selector when autoSave=true', () => {
    render(<EditorTab {...baseProps} autoSave={true} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('does not show typewriter section when typewriterOptions is undefined', () => {
    render(<EditorTab {...baseProps} typewriterOptions={undefined} />);
    expect(screen.queryByText(/打字机|Typewriter/)).not.toBeInTheDocument();
  });

  it('shows typewriter section when typewriterOptions is provided', () => {
    const opts = { dimOthers: false, hideUI: false, showDuration: false };
    render(<EditorTab {...baseProps} typewriterOptions={opts} onTypewriterOptionsChange={vi.fn()} />);
    expect(screen.getAllByText(/打字机|Typewriter/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders file-watch toggle', () => {
    render(<EditorTab {...baseProps} />);
    // Two toggles: autoSave and fileWatch
    expect(screen.getAllByRole('switch').length).toBeGreaterThanOrEqual(2);
  });

  it('hides fileWatchBehavior when fileWatch=false', () => {
    render(<EditorTab {...baseProps} fileWatch={false} />);
    // No combobox when both autoSave and fileWatch are false
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows fileWatchBehavior combobox when fileWatch=true', () => {
    render(<EditorTab {...baseProps} fileWatch={true} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
