/**
 * Toast notification system — lightweight context-based toast queue.
 *
 * Usage:
 *   const { show } = useToast();
 *   show('File saved', 'success');
 *   show('Save failed', 'error');
 */
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { useI18n } from '../../i18n';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

function getDuration(type: ToastType, custom?: number): number {
  if (custom !== undefined) return custom;
  return type === 'error' ? ERROR_DURATION : DEFAULT_DURATION;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++idCounter.current}`;
    const finalDuration = getDuration(type, duration);
    const item: ToastItem = { id, message, type, duration: finalDuration };

    setToasts((prev) => [...prev, item]);

    setTimeout(() => {
      dismiss(id);
    }, finalDuration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  const { t } = useI18n();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '360px',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-toast-type={toast.type}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--bg-primary, #fff)',
            border: '1px solid var(--border-color, #e5e7eb)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '0.8125rem',
            color: 'var(--text-primary, #1f2937)',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          <span style={{ flexShrink: 0 }}>{getIcon(toast.type)}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label={t('toast.close')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'var(--text-tertiary, #9ca3af)',
              fontSize: '0.75rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✗';
    case 'warning': return '⚠';
    case 'info': return 'ℹ';
  }
}
