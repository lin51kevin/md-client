import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileMenuDropdown } from '../../../components/editor/FileMenuDropdown';

// Mock html2canvas
const mockToBlob = vi.fn();
const mockCanvas = { toBlob: mockToBlob };
vi.mock('html2canvas', () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue(mockCanvas),
}));

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
  open: vi.fn(),
  message: vi.fn(),
  confirm: vi.fn(),
}));

describe('Export PNG Feature', () => {
  const defaultProps = {
    onNewTab: vi.fn(),
    onOpenFile: vi.fn(),
    onSaveFile: vi.fn(),
    onSaveAsFile: vi.fn(),
    onExportDocx: vi.fn(),
    onExportPdf: vi.fn(),
    onExportHtml: vi.fn(),
    onExportPng: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Export PNG option in the file menu when onExportPng is provided', async () => {
    render(<FileMenuDropdown {...defaultProps} />);

    // Click to open the menu
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    // Find and hover over Export to show submenu
    await waitFor(() => {
      expect(screen.getByText(/export|导出/i)).toBeInTheDocument();
    });
    const exportItem = screen.getByText(/export|导出/i);
    fireEvent.mouseEnter(exportItem);

    // The export submenu should contain PNG option
    await waitFor(() => {
      expect(screen.getByText(/png/i)).toBeInTheDocument();
    });
  });

  it('should call onExportPng when PNG option is clicked', async () => {
    render(<FileMenuDropdown {...defaultProps} />);

    // Open menu
    fireEvent.click(screen.getByRole('button'));

    // Find and click Export to open submenu
    await waitFor(() => {
      expect(screen.getByText(/export|导出/i)).toBeInTheDocument();
    });

    // Hover over Export to show submenu
    const exportItem = screen.getByText(/export|导出/i);
    fireEvent.mouseEnter(exportItem);

    // Click PNG option
    await waitFor(() => {
      expect(screen.getByText(/png/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/png/i));

    expect(defaultProps.onExportPng).toHaveBeenCalledTimes(1);
  });

  it('should not show PNG option when onExportPng is not provided', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onExportPng, ...propsWithoutPng } = defaultProps;
    render(<FileMenuDropdown {...propsWithoutPng} />);

    // Open menu
    fireEvent.click(screen.getByRole('button'));

    // Hover export to show submenu (may or may not be visible yet)
    try {
      const exportItem = screen.getByText(/export|导出/i);
      fireEvent.mouseEnter(exportItem);
    } catch {
      // Export item may not have rendered yet without waiting
    }

    // PNG should not be in the DOM
    expect(screen.queryByText(/png/i)).not.toBeInTheDocument();
  });
});
