import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalErrorBoundary } from '../../components/GlobalErrorBoundary';

// Mock useI18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
    setLocale: vi.fn(),
  }),
  getT: () => (key: string) => key,
}));

// A component that throws on render
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>child content</div>;
}

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console.error noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children normally when no error', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('catches rendering error and shows recovery UI', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    // Should show error boundary UI, not the child
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
    expect(screen.getByText('errorBoundary.title')).toBeInTheDocument();
    expect(screen.getByText('errorBoundary.message')).toBeInTheDocument();
  });

  it('shows reload button that reloads the page', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <GlobalErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    const reloadButton = screen.getByText('errorBoundary.reload');
    expect(reloadButton).toBeInTheDocument();
    fireEvent.click(reloadButton);
    expect(reloadMock).toHaveBeenCalled();
  });

  it('displays error details in non-production mode', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText(/Test render error/)).toBeInTheDocument();
  });
});
