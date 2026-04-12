import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileMenuDropdown } from '../../components/FileMenuDropdown';

const defaultProps = {
  onNewTab: vi.fn(),
  onOpenFile: vi.fn(),
  onSaveFile: vi.fn(),
  onSaveAsFile: vi.fn(),
  onExportDocx: vi.fn(),
  onExportPdf: vi.fn(),
  onExportHtml: vi.fn(),
};

const recentFiles = [
  { path: '/docs/note.md', name: 'note.md', openedAt: '2024-01-01T00:00:00Z' },
];

describe('FileMenuDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the trigger button', () => {
    render(<FileMenuDropdown {...defaultProps} />);
    // zh-CN: toolbar.fileMenu = '文件'
    expect(screen.getByText('文件')).toBeInTheDocument();
  });

  it('opens the dropdown on click', () => {
    render(<FileMenuDropdown {...defaultProps} />);
    fireEvent.click(screen.getByText('文件'));
    // zh-CN: file.save = '保存'
    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('closes the dropdown when Escape is pressed', () => {
    render(<FileMenuDropdown {...defaultProps} />);
    fireEvent.click(screen.getByText('文件'));
    expect(screen.getByText('保存')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('保存')).not.toBeInTheDocument();
  });

  it('calls onSaveFile when Save is clicked', () => {
    const onSaveFile = vi.fn();
    render(<FileMenuDropdown {...defaultProps} onSaveFile={onSaveFile} />);
    fireEvent.click(screen.getByText('文件'));
    fireEvent.click(screen.getByText('保存'));
    expect(onSaveFile).toHaveBeenCalledOnce();
  });

  it('shows recent files submenu when hovering over recent item', () => {
    render(
      <FileMenuDropdown
        {...defaultProps}
        recentFiles={recentFiles}
        onOpenRecent={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('文件'));

    // zh-CN: file.openRecent = '打开最近文件'
    const recentItem = screen.getByTitle('打开最近文件');
    fireEvent.mouseEnter(recentItem);

    expect(screen.getByText('note.md')).toBeInTheDocument();
  });

  it('closes submenu when hovering over an item without submenu (bug fix)', async () => {
    render(
      <FileMenuDropdown
        {...defaultProps}
        recentFiles={recentFiles}
        onOpenRecent={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('文件'));

    // Open the recent submenu
    const recentItem = screen.getByTitle('打开最近文件');
    fireEvent.mouseEnter(recentItem);
    expect(screen.getByText('note.md')).toBeInTheDocument();

    // Hover over Save (no submenu) — closes submenu via a 150ms setTimeout
    const saveItem = screen.getByTitle('保存');
    fireEvent.mouseEnter(saveItem);
    await waitFor(() => {
      expect(screen.queryByText('note.md')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
