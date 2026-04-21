import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilesTab } from '../../../../components/modal/settings/FilesTab';

vi.mock('../../../../lib/utils', () => ({
  getImageSaveDir: vi.fn(() => '/images'),
  setImageSaveDir: vi.fn(),
}));

const baseProps = {
  gitMdOnly: false,
  onGitMdOnlyChange: vi.fn(),
};

describe('FilesTab', () => {
  it('renders image directory input', () => {
    render(<FilesTab {...baseProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('image directory input reflects saved dir', () => {
    render(<FilesTab {...baseProps} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('/images');
  });

  it('image directory input updates on change', () => {
    render(<FilesTab {...baseProps} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '/new/path' } });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('/new/path');
  });

  it('renders gitMdOnly toggle', () => {
    render(<FilesTab {...baseProps} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('gitMdOnly toggle off when gitMdOnly=false', () => {
    render(<FilesTab {...baseProps} gitMdOnly={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('gitMdOnly toggle on when gitMdOnly=true', () => {
    render(<FilesTab {...baseProps} gitMdOnly={true} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onGitMdOnlyChange when toggle clicked', () => {
    const onGitMdOnlyChange = vi.fn();
    render(<FilesTab {...baseProps} onGitMdOnlyChange={onGitMdOnlyChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onGitMdOnlyChange).toHaveBeenCalledWith(true);
  });
});
