import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../components/toast';

// Mock useI18n
vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
    setLocale: vi.fn(),
  }),
}));

// Helper component to trigger toasts
function ToastTrigger({ type, message, duration }: { type?: 'success' | 'error' | 'warning' | 'info'; message: string; duration?: number }) {
  const { show } = useToast();
  return (
    <button onClick={() => show(message, type, duration)}>
      trigger
    </button>
  );
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('Toast notification system', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('useToast show() adds a toast to the DOM', () => {
    renderWithProvider(<ToastTrigger message="Hello toast" />);

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('Hello toast')).toBeInTheDocument();
  });

  it('toast auto-dismisses after default duration', () => {
    renderWithProvider(<ToastTrigger message="Auto dismiss" />);

    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('error toast has longer auto-dismiss duration', () => {
    renderWithProvider(<ToastTrigger message="Error msg" type="error" />);

    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Error msg')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // Still visible at 4s (error duration is 6s)
    expect(screen.getByText('Error msg')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('Error msg')).not.toBeInTheDocument();
  });

  it('multiple toasts stack', () => {
    renderWithProvider(
      <>
        <ToastTrigger message="First" />
        <ToastTrigger message="Second" />
      </>
    );

    // Can only click the first "trigger" button (both have same text)
    const buttons = screen.getAllByText('trigger');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('toast types render with correct data-type attribute', () => {
    renderWithProvider(
      <>
        <ToastTrigger message="success-msg" type="success" />
        <ToastTrigger message="error-msg" type="error" />
        <ToastTrigger message="warning-msg" type="warning" />
        <ToastTrigger message="info-msg" type="info" />
      </>
    );

    const buttons = screen.getAllByText('trigger');
    buttons.forEach((btn) => fireEvent.click(btn));

    expect(screen.getByText('success-msg').closest('[data-toast-type]')).toHaveAttribute('data-toast-type', 'success');
    expect(screen.getByText('error-msg').closest('[data-toast-type]')).toHaveAttribute('data-toast-type', 'error');
    expect(screen.getByText('warning-msg').closest('[data-toast-type]')).toHaveAttribute('data-toast-type', 'warning');
    expect(screen.getByText('info-msg').closest('[data-toast-type]')).toHaveAttribute('data-toast-type', 'info');
  });

  it('manual dismiss via close button', () => {
    renderWithProvider(<ToastTrigger message="Dismiss me" />);

    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Dismiss me')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('toast.close');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });

  it('custom duration is respected', () => {
    renderWithProvider(<ToastTrigger message="Custom" duration={2000} />);

    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Custom')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
  });
});
