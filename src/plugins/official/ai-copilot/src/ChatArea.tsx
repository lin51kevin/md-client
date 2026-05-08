import { createElement, useEffect, useRef } from 'react';
import type { CopilotMessage, EditAction } from './providers/types';
import { ChatMessageView } from './ChatMessage';

interface ChatAreaProps {
  messages: CopilotMessage[];
  emptyHint: string;
  onApply: (action: EditAction) => void;
  onDiscard: (id: string) => void;
  onDiscardAll: (messageId: string) => void;
}

export function ChatArea({ messages, emptyHint, onApply, onDiscard, onDiscardAll }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  return createElement(
    'div',
    {
      style: {
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        padding: '4px 0 8px',
      },
    },
    messages.length === 0
      ? createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '20px',
              color: 'var(--text-muted, #888)',
            },
          },
          createElement(
            'div',
            { style: { fontSize: '13px', textAlign: 'center', lineHeight: '1.6' } },
            emptyHint,
          ),
        )
      : null,
    ...messages.map((msg) =>
      createElement(ChatMessageView, {
        key: msg.id,
        message: msg,
        onApply,
        onDiscard,
        onDiscardAll: () => onDiscardAll(msg.id),
      }),
    ),
    createElement('div', { ref: messagesEndRef }),
  );
}
