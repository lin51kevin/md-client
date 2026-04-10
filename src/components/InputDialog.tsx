import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n';

export interface InputDialogConfig {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

interface InputDialogProps extends InputDialogConfig {
  visible: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function InputDialog({
  visible,
  title,
  description,
  placeholder = '',
  defaultValue = '',
  confirmLabel,
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const { t } = useI18n();
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onCancel]);

  const handleConfirm = () => {
    const value = inputRef.current?.value?.trim() ?? '';
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirm();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[10000]"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg shadow-xl p-5 min-w-80 max-w-md w-full mx-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {title}
          </span>
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-6 h-6 rounded"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 text-sm rounded text-inherit outline-none mb-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-color)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        />

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs rounded font-medium"
            style={{
              backgroundColor: 'var(--accent-color)',
              color: '#fff',
              border: '1px solid var(--accent-color)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
