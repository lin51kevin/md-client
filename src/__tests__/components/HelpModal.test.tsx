import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpModal } from '../../components/HelpModal';

// ?raw imports return a string in Vitest — mock the markdown to keep tests fast
vi.mock('../../../USER_GUIDE.md?raw', () => ({ default: '# 快速入门\n\n## 基础操作\n\n内容' }));

describe('HelpModal', () => {
  it('renders nothing when visible is false', () => {
    render(<HelpModal visible={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('快速入门')).not.toBeInTheDocument();
  });

  it('renders the modal when visible is true', () => {
    render(<HelpModal visible={true} onClose={vi.fn()} />);
    // Both the TOC sidebar and the h1 render this heading text
    const headings = screen.getAllByText('快速入门');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal visible={true} onClose={onClose} />);
    // Close button (X icon) has no text; find by querying all buttons and picking the one with aria-label or title
    const closeBtn = screen.getAllByRole('button').find((btn) =>
      btn.getAttribute('title') !== null || btn.querySelector('svg') !== null,
    );
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<HelpModal visible={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
