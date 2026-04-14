import { createElement } from 'react';
import { Check, X, AlertTriangle, Bot } from 'lucide-react';
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

  if (isUser) {
    // ── User message: right-aligned bubble ──
    return createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '4px 12px',
          marginTop: '4px',
        },
      },
      createElement(
        'div',
        {
          style: {
            maxWidth: '82%',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--text-primary, #e0e0e0)',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          },
        },
        displayContent,
      ),
    );
  }

  // ── AI message: left-aligned with icon label ──
  return createElement(
    'div',
    {
      style: {
        padding: '6px 12px 4px',
        marginTop: '4px',
      },
    },
    // Icon + label row
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          marginBottom: '5px',
          color: 'var(--text-muted, #888)',
        },
      },
      createElement(Bot, { size: 13 }),
      createElement(
        'span',
        {
          style: { fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px' },
        },
        t('aiCopilot.panel.assistant'),
      ),
    ),
    // Content
    createElement(
      'div',
      {
        style: {
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--text-primary, #e0e0e0)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          paddingLeft: '2px',
        },
      },
      displayContent,
      message.isStreaming
        ? createElement('span', {
            style: {
              display: 'inline-block',
              width: '2px',
              height: '13px',
              background: 'var(--text-primary, #e0e0e0)',
              marginLeft: '2px',
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
