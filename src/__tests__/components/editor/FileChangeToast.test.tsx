import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileChangeToast } from '../../../components/editor/FileChangeToast';

// Mock useI18n
vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
    setLocale: vi.fn(),
  }),
}));

describe('FileChangeToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should render modified toast with reload and keep buttons', () => {
    const onReload = vi.fn();
    const onKeep = vi.fn();
    const onSaveAs = vi.fn();
    const onClose = vi.fn();

    render(
      <FileChangeToast
        type="modified"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={true}
        onReload={onReload}
        onKeep={onKeep}
        onSaveAs={onSaveAs}
        onClose={onClose}
      />
    );

    expect(screen.getByText('fileWatcher.modified')).toBeInTheDocument();
    expect(screen.getByText('fileWatcher.reload')).toBeInTheDocument();
    expect(screen.getByText('fileWatcher.keep')).toBeInTheDocument();
    expect(screen.queryByText('fileWatcher.saveAs')).not.toBeInTheDocument();
  });

  it('should render deleted toast with saveAs button', () => {
    const onReload = vi.fn();
    const onKeep = vi.fn();
    const onSaveAs = vi.fn();
    const onClose = vi.fn();

    render(
      <FileChangeToast
        type="deleted"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={false}
        onReload={onReload}
        onKeep={onKeep}
        onSaveAs={onSaveAs}
        onClose={onClose}
      />
    );

    expect(screen.getByText('fileWatcher.deleted')).toBeInTheDocument();
    expect(screen.getByText('fileWatcher.saveAs')).toBeInTheDocument();
    expect(screen.queryByText('fileWatcher.reload')).not.toBeInTheDocument();
  });

  it('should call onReload when reload button clicked', () => {
    const onReload = vi.fn();
    const onKeep = vi.fn();
    const onSaveAs = vi.fn();
    const onClose = vi.fn();

    render(
      <FileChangeToast
        type="modified"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={true}
        onReload={onReload}
        onKeep={onKeep}
        onSaveAs={onSaveAs}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('fileWatcher.reload'));
    expect(onReload).toHaveBeenCalledWith('tab-1');
  });

  it('should call onKeep when keep button clicked', () => {
    const onReload = vi.fn();
    const onKeep = vi.fn();
    const onSaveAs = vi.fn();
    const onClose = vi.fn();

    render(
      <FileChangeToast
        type="modified"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={true}
        onReload={onReload}
        onKeep={onKeep}
        onSaveAs={onSaveAs}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('fileWatcher.keep'));
    expect(onKeep).toHaveBeenCalled();
  });

  it('should call onSaveAs when saveAs button clicked', () => {
    const onReload = vi.fn();
    const onKeep = vi.fn();
    const onSaveAs = vi.fn();
    const onClose = vi.fn();

    render(
      <FileChangeToast
        type="deleted"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={false}
        onReload={onReload}
        onKeep={onKeep}
        onSaveAs={onSaveAs}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('fileWatcher.saveAs'));
    expect(onSaveAs).toHaveBeenCalledWith('tab-1');
  });

  it('should auto-dismiss after 10 seconds when tab is NOT dirty', () => {
    const onClose = vi.fn();
    render(
      <FileChangeToast
        type="modified"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={false}
        onReload={vi.fn()}
        onKeep={vi.fn()}
        onSaveAs={vi.fn()}
        onClose={onClose}
      />
    );

    vi.advanceTimersByTime(10_000);
    expect(onClose).toHaveBeenCalled();
  });

  it('should NOT auto-dismiss when tab IS dirty (persistent until action)', () => {
    const onClose = vi.fn();
    render(
      <FileChangeToast
        type="modified"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={true}
        onReload={vi.fn()}
        onKeep={vi.fn()}
        onSaveAs={vi.fn()}
        onClose={onClose}
      />
    );

    vi.advanceTimersByTime(100_000); // way past the 10s threshold
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should NOT show close button when tab is dirty', () => {
    render(
      <FileChangeToast
        type="modified"
        filePath="/path/to/file.md"
        tabId="tab-1"
        isDirty={true}
        onReload={vi.fn()}
        onKeep={vi.fn()}
        onSaveAs={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // No standalone close button (X) — only Reload and Keep actions
    // The toast has reload + keep buttons but no X close icon
    const buttons = screen.getAllByRole('button');
    // Should have reload + keep (2 buttons), no close button
    expect(buttons.length).toBe(2);
  });
});
