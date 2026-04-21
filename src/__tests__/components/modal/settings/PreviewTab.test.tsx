import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewTab } from '../../../../components/modal/settings/PreviewTab';

const baseProps = {
  milkdownPreview: true,
  onMilkdownPreviewChange: vi.fn(),
  mermaidTheme: 'default',
  onMermaidThemeChange: vi.fn(),
};

describe('PreviewTab', () => {
  it('renders milkdown preview toggle', () => {
    render(<PreviewTab {...baseProps} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('toggle is on when milkdownPreview=true', () => {
    render(<PreviewTab {...baseProps} milkdownPreview={true} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggle is off when milkdownPreview=false', () => {
    render(<PreviewTab {...baseProps} milkdownPreview={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onMilkdownPreviewChange(false) when toggled off', () => {
    const onMilkdownPreviewChange = vi.fn();
    render(<PreviewTab {...baseProps} milkdownPreview={true} onMilkdownPreviewChange={onMilkdownPreviewChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onMilkdownPreviewChange).toHaveBeenCalledWith(false);
  });

  it('renders mermaid theme select', () => {
    render(<PreviewTab {...baseProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('mermaid theme select has current value', () => {
    render(<PreviewTab {...baseProps} mermaidTheme="forest" />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('forest');
  });

  it('calls onMermaidThemeChange when theme changed', () => {
    const onMermaidThemeChange = vi.fn();
    render(<PreviewTab {...baseProps} onMermaidThemeChange={onMermaidThemeChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dark' } });
    expect(onMermaidThemeChange).toHaveBeenCalledWith('dark');
  });
});
