import { createElement } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import type { CopilotMessage } from './providers/types';
import { useI18n } from '../../../../i18n';

interface ChatMessageProps {
  message: CopilotMessage;
  onApply?: (action: import('./providers/types').EditAction) => void;
  onDiscard?: (actionId: string) => void;
}

export function ChatMessageView({ message, onApply, onDiscard }: ChatMessageProps) {
  const { t } = useI18n();
  const isUser = message.role === 'user';
  const displayContent = message.content || (message.error ? t('aiCopilot.panel.errorOccurred') : '');

  return createElement(
    'div',
    {
      style: {
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-color, #2a2a2a)',
      },
    },
    // Role label
    createElement(
      'div',
      {
        style: {
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-secondary, #ccc)',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        },
      },
      isUser ? t('aiCopilot.panel.you') : t('aiCopilot.panel.assistant'),
    ),
    // Message content
    createElement(
      'div',
      {
        style: {
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--text-primary, #e0e0e0)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        },
      },
      displayContent,
      message.isStreaming
        ? createElement('span', {
            style: {
              display: 'inline-block',
              width: '2px',
              height: '14px',
              background: 'var(--text-primary, #e0e0e0)',
              marginLeft: '1px',
              animation: 'blink 1s step-end infinite',
              verticalAlign: 'text-bottom',
            },
          })
        : null,
    ),
    // Error
    message.error
      ? createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--error-color, #f44)',
              marginTop: '6px',
            },
          },
          createElement(AlertTriangle, { size: 12 }),
          message.error,
        )
      : null,
    // Actions (apply/discard)
    message.actions && message.actions.length > 0 && !message.isStreaming
      ? createElement(
          'div',
          { style: { display: 'flex', gap: '6px', marginTop: '10px' } },
          ...message.actions.map((action) =>
            createElement(
              'div',
              { key: action.id, style: { display: 'flex', gap: '6px' } },
              createElement(
                'button',
                {
                  onClick: () => onApply?.(action),
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    border: 'none',
                    borderRadius: '3px',
                    background: 'var(--accent-color, #4a9eff)',
                    color: '#fff',
                    cursor: 'pointer',
                  },
                },
                createElement(Check, { size: 12 }),
                t('aiCopilot.panel.apply'),
              ),
              createElement(
                'button',
                {
                  onClick: () => onDiscard?.(action.id),
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    border: '1px solid var(--border-color, #444)',
                    borderRadius: '3px',
                    background: 'transparent',
                    color: 'var(--text-secondary, #ccc)',
                    cursor: 'pointer',
                  },
                },
                createElement(X, { size: 12 }),
                t('aiCopilot.panel.discard'),
              ),
            ),
          ),
        )
      : null,
  );
}
