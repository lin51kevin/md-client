import { createElement } from 'react';
import { Check, X, AlertTriangle, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { CopilotMessage } from './providers/types';
import { useI18n } from '../../../../i18n';

// Inject keyframe animations once
if (typeof document !== 'undefined' && !document.getElementById('ai-copilot-chat-styles')) {
  const style = document.createElement('style');
  style.id = 'ai-copilot-chat-styles';
  style.textContent = `
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes ai-thinking-dot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
      30% { transform: translateY(-4px); opacity: 1; }
    }
    .ai-chat-md { word-break: break-word; }
    .ai-chat-md p { margin: 0.35em 0; }
    .ai-chat-md p:first-child { margin-top: 0; }
    .ai-chat-md p:last-child { margin-bottom: 0; }
    .ai-chat-md ul, .ai-chat-md ol { margin: 0.35em 0; padding-left: 1.5em; }
    .ai-chat-md li { margin: 0.15em 0; }
    .ai-chat-md code {
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 0.9em;
      background: rgba(255,255,255,0.07);
      padding: 0.15em 0.35em;
      border-radius: 3px;
    }
    .ai-chat-md pre {
      margin: 0.5em 0;
      padding: 10px 12px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }
    .ai-chat-md pre code {
      background: none;
      padding: 0;
      font-size: inherit;
    }
    .ai-chat-md blockquote {
      margin: 0.5em 0;
      padding: 0.25em 0.75em;
      border-left: 3px solid var(--accent-color, #4a9eff);
      color: var(--text-muted, #aaa);
    }
    .ai-chat-md h1, .ai-chat-md h2, .ai-chat-md h3,
    .ai-chat-md h4, .ai-chat-md h5, .ai-chat-md h6 {
      margin: 0.6em 0 0.3em;
      line-height: 1.3;
    }
    .ai-chat-md h1 { font-size: 1.25em; }
    .ai-chat-md h2 { font-size: 1.15em; }
    .ai-chat-md h3 { font-size: 1.05em; }
    .ai-chat-md table {
      border-collapse: collapse;
      margin: 0.5em 0;
      font-size: 12px;
    }
    .ai-chat-md th, .ai-chat-md td {
      border: 1px solid var(--border-color, #444);
      padding: 4px 8px;
    }
    .ai-chat-md th { background: rgba(255,255,255,0.05); }
    .ai-chat-md a { color: var(--accent-color, #4a9eff); text-decoration: none; }
    .ai-chat-md a:hover { text-decoration: underline; }
    .ai-chat-md hr { border: none; border-top: 1px solid var(--border-color, #444); margin: 0.75em 0; }
  `;
  document.head.appendChild(style);
}

function ThinkingDots() {
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        gap: '5px',
        alignItems: 'center',
        padding: '4px 2px',
      },
    },
    ...[0, 1, 2].map((i) =>
      createElement('span', {
        key: i,
        style: {
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--text-muted, #888)',
          display: 'inline-block',
          animation: `ai-thinking-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
        },
      }),
    ),
  );
}

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
        className: 'ai-chat-md',
        style: {
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--text-primary, #e0e0e0)',
          paddingLeft: '2px',
        },
      },
      message.isStreaming && !message.content
        ? createElement(ThinkingDots, null)
        : createElement(ReactMarkdown, {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeHighlight],
          }, displayContent),
      message.isStreaming && message.content
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
