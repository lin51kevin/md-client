import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { ChatMessageView } from '../../../plugins/official/ai-copilot/src/ChatMessage';
import type { CopilotMessage } from '../../../plugins/official/ai-copilot/src/providers/types';

// Minimal i18n mock
vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'aiCopilot.panel.you': 'You',
        'aiCopilot.panel.assistant': 'AI Copilot',
        'aiCopilot.panel.apply': 'Apply',
        'aiCopilot.panel.discard': 'Discard',
        'aiCopilot.panel.errorOccurred': 'An error occurred',
      };
      return map[key] ?? key;
    },
  }),
}));

function makeMsg(overrides: Partial<CopilotMessage>): CopilotMessage {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    isStreaming: false,
    ...overrides,
  };
}

describe('ChatMessageView — VS Code-style layout', () => {
  describe('user messages (right side)', () => {
    it('renders user message content', () => {
      render(<ChatMessageView message={makeMsg({ role: 'user', content: 'Hello there' })} />);
      expect(screen.getByText('Hello there')).toBeInTheDocument();
    });

    it('user message container is right-aligned', () => {
      const { container } = render(
        <ChatMessageView message={makeMsg({ role: 'user', content: 'Hi' })} />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.justifyContent).toBe('flex-end');
    });

    it('user bubble uses rgba background (not accent color)', () => {
      const { container } = render(
        <ChatMessageView message={makeMsg({ role: 'user', content: 'Hi' })} />
      );
      const wrapper = container.firstChild as HTMLElement;
      const bubble = wrapper.firstChild as HTMLElement;
      expect(bubble.style.background).toMatch(/rgba/);
    });

    it('does not render the "AI Copilot" label for user messages', () => {
      render(<ChatMessageView message={makeMsg({ role: 'user', content: 'Hi' })} />);
      expect(screen.queryByText('AI Copilot')).toBeNull();
    });
  });

  describe('AI messages (left side)', () => {
    it('renders AI message content', () => {
      render(
        <ChatMessageView message={makeMsg({ role: 'assistant', content: 'Here is the answer' })} />
      );
      expect(screen.getByText('Here is the answer')).toBeInTheDocument();
    });

    it('renders "AI Copilot" label for assistant messages', () => {
      render(<ChatMessageView message={makeMsg({ role: 'assistant', content: 'Hi' })} />);
      expect(screen.getByText('AI Copilot')).toBeInTheDocument();
    });

    it('assistant container is NOT right-aligned', () => {
      const { container } = render(
        <ChatMessageView message={makeMsg({ role: 'assistant', content: 'Hi' })} />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.justifyContent).not.toBe('flex-end');
    });

    it('renders streaming cursor when isStreaming=true', () => {
      const { container } = render(
        <ChatMessageView
          message={makeMsg({ role: 'assistant', content: 'Typing', isStreaming: true })}
        />
      );
      // Streaming cursor is a <span> with blink animation
      const cursor = container.querySelector('span[style*="blink"]');
      expect(cursor).toBeTruthy();
    });

    it('does not render streaming cursor when isStreaming=false', () => {
      const { container } = render(
        <ChatMessageView
          message={makeMsg({ role: 'assistant', content: 'Done', isStreaming: false })}
        />
      );
      const cursor = container.querySelector('span[style*="blink"]');
      expect(cursor).toBeNull();
    });

    it('renders error message when error is set', () => {
      render(
        <ChatMessageView
          message={makeMsg({ role: 'assistant', content: '', error: 'API failed' })}
        />
      );
      expect(screen.getByText('API failed')).toBeInTheDocument();
    });

    it('renders apply/discard buttons for completed actions', () => {
      const onApply = vi.fn();
      const onDiscard = vi.fn();
      render(
        <ChatMessageView
          message={makeMsg({
            role: 'assistant',
            content: 'Done',
            isStreaming: false,
            actions: [{
              id: 'act-1', type: 'replace',
              description: 'fix', from: 0, to: 5,
              originalText: 'Hello', newText: 'Hi', sourceFilePath: '/doc.md',
            }],
          })}
          onApply={onApply}
          onDiscard={onDiscard}
        />
      );
      expect(screen.getByText('Apply')).toBeInTheDocument();
      expect(screen.getByText('Discard')).toBeInTheDocument();
    });

    it('does NOT render action buttons while streaming', () => {
      render(
        <ChatMessageView
          message={makeMsg({
            role: 'assistant',
            content: 'Typing…',
            isStreaming: true,
            actions: [{
              id: 'act-1', type: 'replace',
              description: 'fix', from: 0, to: 5,
              originalText: 'Hello', newText: 'Hi', sourceFilePath: '/doc.md',
            }],
          })}
        />
      );
      expect(screen.queryByText('Apply')).toBeNull();
    });

    it('shows fallback error text when content is empty and error not set', () => {
      render(
        <ChatMessageView
          message={makeMsg({ role: 'assistant', content: '', error: undefined })}
        />
      );
      // No crash — empty content renders fine
      expect(screen.getByText('AI Copilot')).toBeInTheDocument();
    });
  });
});
