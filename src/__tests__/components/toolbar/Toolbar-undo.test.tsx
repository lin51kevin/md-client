import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../../components/toolbar/Toolbar';
import type { ViewMode, FocusMode } from '../../../types';

vi.mock('../../../i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

const defaultProps = {
  viewMode: 'split' as ViewMode,
  focusMode: 'normal' as FocusMode,
  onNewTab: vi.fn(),
  onOpenFile: vi.fn(),
  onSaveFile: vi.fn(),
  onSaveAsFile: vi.fn(),
  onExportDocx: vi.fn(),
  onExportPdf: vi.fn(),
  onExportHtml: vi.fn(),
  onSetViewMode: vi.fn(),
};

describe('Toolbar Undo/Redo', () => {
  it('renders undo and redo buttons', () => {
    render(<Toolbar {...defaultProps} canUndo={false} canRedo={false} onUndo={vi.fn()} onRedo={vi.fn()} />);
    expect(screen.getByTitle('toolbar.undo')).toBeTruthy();
    expect(screen.getByTitle('toolbar.redo')).toBeTruthy();
  });

  it('disables undo when canUndo is false', () => {
    render(<Toolbar {...defaultProps} canUndo={false} canRedo={true} onUndo={vi.fn()} onRedo={vi.fn()} />);
    const undoBtn = screen.getByTitle('toolbar.undo').closest('button');
    expect(undoBtn?.disabled).toBe(true);
  });

  it('disables redo when canRedo is false', () => {
    render(<Toolbar {...defaultProps} canUndo={true} canRedo={false} onUndo={vi.fn()} onRedo={vi.fn()} />);
    const redoBtn = screen.getByTitle('toolbar.redo').closest('button');
    expect(redoBtn?.disabled).toBe(true);
  });

  it('enables both when canUndo and canRedo are true', () => {
    render(<Toolbar {...defaultProps} canUndo={true} canRedo={true} onUndo={vi.fn()} onRedo={vi.fn()} />);
    expect(screen.getByTitle('toolbar.undo').closest('button')?.disabled).toBe(false);
    expect(screen.getByTitle('toolbar.redo').closest('button')?.disabled).toBe(false);
  });

  it('calls onUndo when undo button is clicked', () => {
    const onUndo = vi.fn();
    render(<Toolbar {...defaultProps} canUndo={true} canRedo={false} onUndo={onUndo} onRedo={vi.fn()} />);
    fireEvent.click(screen.getByTitle('toolbar.undo').closest('button')!);
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('calls onRedo when redo button is clicked', () => {
    const onRedo = vi.fn();
    render(<Toolbar {...defaultProps} canUndo={false} canRedo={true} onUndo={vi.fn()} onRedo={onRedo} />);
    fireEvent.click(screen.getByTitle('toolbar.redo').closest('button')!);
    expect(onRedo).toHaveBeenCalledOnce();
  });
});
