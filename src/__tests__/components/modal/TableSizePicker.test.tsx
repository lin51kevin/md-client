import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableSizePicker } from '../../../components/modal/TableSizePicker';

vi.mock('../../../i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'toolbar.tableSize' && params) {
        return `${params.rows}×${params.cols}`;
      }
      if (key === 'toolbar.table') return '插入表格';
      return key;
    },
  })),
}));

describe('TableSizePicker', () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial 5×5 grid (25 cells)', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    // Each cell is a div with a cursor-pointer class
    const cells = container.querySelectorAll('.cursor-pointer');
    expect(cells.length).toBe(25);
  });

  it('shows default label text before hovering', () => {
    render(<TableSizePicker onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByText('插入表格')).toBeInTheDocument();
  });

  it('updates label text when hovering over a cell', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    const cells = container.querySelectorAll('.cursor-pointer');
    // Hover over cell at row=1, col=2 (0-indexed → hoverRow=2, hoverCol=3)
    // The cells are laid out row by row with visibleCols columns per row
    // Cell index = row * visibleCols + col = 1 * 5 + 2 = 7
    fireEvent.mouseEnter(cells[7]);
    expect(screen.getByText('2×3')).toBeInTheDocument();
  });

  it('calls onSelect with correct rows and cols when a cell is clicked', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    const cells = container.querySelectorAll('.cursor-pointer');
    // Click cell at index 0 → row=0,col=0 → onSelect(1, 1)
    fireEvent.click(cells[0]);
    expect(onSelect).toHaveBeenCalledWith(1, 1);
  });

  it('calls onSelect with (3, 4) when clicking the cell at row=2,col=3', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    const cells = container.querySelectorAll('.cursor-pointer');
    // Cell index = 2 * 5 + 3 = 13
    fireEvent.click(cells[13]);
    expect(onSelect).toHaveBeenCalledWith(3, 4);
  });

  it('calls onClose after a cell is clicked', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    const cells = container.querySelectorAll('.cursor-pointer');
    fireEvent.click(cells[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resets label when mouse leaves the picker', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    const cells = container.querySelectorAll('.cursor-pointer');
    fireEvent.mouseEnter(cells[7]);
    expect(screen.getByText('2×3')).toBeInTheDocument();

    // Mouse leaves the outer container
    fireEvent.mouseLeave(container.firstChild as Element);
    expect(screen.getByText('插入表格')).toBeInTheDocument();
  });

  it('calls onClose when clicking outside the picker', () => {
    render(<TableSizePicker onSelect={onSelect} onClose={onClose} />);
    // Simulate mousedown outside
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the picker', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    fireEvent.mouseDown(container.firstChild as Element);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('grid expands beyond 5 when hovering near the edge', () => {
    const { container } = render(
      <TableSizePicker onSelect={onSelect} onClose={onClose} />
    );
    let cells = container.querySelectorAll('.cursor-pointer');
    expect(cells.length).toBe(25); // 5×5 initially

    // Hover over last visible cell in the 5×5 grid (row=4,col=4 → index=24)
    fireEvent.mouseEnter(cells[24]);
    // hoverRow=5, hoverCol=5 → visibleRows=Math.max(5,min(6,8))=6, visibleCols=6
    cells = container.querySelectorAll('.cursor-pointer');
    expect(cells.length).toBe(36); // 6×6
  });
});
