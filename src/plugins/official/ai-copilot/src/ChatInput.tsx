import { createElement, useState, useCallback, useRef } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import type { AIConfig } from './config-store';
import {
  SlashCommandPopup,
  getFilteredCommandCount,
  getFilteredCommandAt,
  getSlashCommandToken,
} from './QuickCommands';
import { ModelSelectorView } from './ModelSelector';

export interface ChatInputCallbacks {
  onSend: (text: string) => void;
  onStop: () => void;
  onSelectProvider: (provider: string) => void;
  onToggleApplyMode: () => void;
}

interface ChatInputProps {
  isLoading: boolean;
  config: AIConfig | null;
  selectedProvider: string;
  messagesEmpty: boolean;
  placeholder: string;
  tipHint: string;
  /** i18n labels */
  labels: {
    stop: string;
    send: string;
    autoLabel: string;
    manualLabel: string;
    autoTooltip: string;
    manualTooltip: string;
  };
  callbacks: ChatInputCallbacks;
  /** i18n translate function (needed for slash commands) */
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ChatInput({
  isLoading,
  config,
  selectedProvider,
  messagesEmpty,
  placeholder,
  tipHint,
  labels,
  callbacks,
  t,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showSlashPopup, setShowSlashPopup] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSlashSelect = useCallback((command: string) => {
    setInput(command);
    setShowSlashPopup(false);
    inputRef.current?.focus();
  }, []);

  const resolveOpenSlashCommand = useCallback(() => {
    if (!showSlashPopup) return false;

    const count = getFilteredCommandCount(slashFilter, t);
    if (count === 0) return false;

    const idx = slashSelectedIndex >= 0 ? slashSelectedIndex : 0;
    const cmd = getFilteredCommandAt(slashFilter, idx, t);
    if (!cmd) return false;

    handleSlashSelect(cmd + ' ');
    return true;
  }, [handleSlashSelect, showSlashPopup, slashFilter, slashSelectedIndex]);

  const handleSend = useCallback(() => {
    if (isComposing) return;
    if (resolveOpenSlashCommand()) return;
    if (!input.trim()) return;
    callbacks.onSend(input.trim());
    setInput('');
    setShowSlashPopup(false);
  }, [input, isComposing, resolveOpenSlashCommand, callbacks]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    const slashToken = getSlashCommandToken(value);
    if (slashToken !== null) {
      setShowSlashPopup(true);
      setSlashFilter(slashToken);
      setSlashSelectedIndex(0);
    } else {
      setShowSlashPopup(false);
      setSlashFilter('');
      setSlashSelectedIndex(-1);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const nativeEvent = e.nativeEvent as KeyboardEvent;
      if (nativeEvent.isComposing || nativeEvent.keyCode === 229) {
        return;
      }
      if (showSlashPopup) {
        const count = getFilteredCommandCount(slashFilter, t);
        if (e.key === 'ArrowDown') {
          if (count === 0) return;
          e.preventDefault();
          setSlashSelectedIndex((prev) => (prev + 1) % count);
          return;
        }
        if (e.key === 'ArrowUp') {
          if (count === 0) return;
          e.preventDefault();
          setSlashSelectedIndex((prev) => (prev <= 0 ? count - 1 : prev - 1));
          return;
        }
        if ((e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) && count > 0) {
          e.preventDefault();
          resolveOpenSlashCommand();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSlashPopup(false);
          setSlashSelectedIndex(-1);
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [showSlashPopup, slashFilter, resolveOpenSlashCommand, handleSend],
  );

  const applyMode = config?.general?.applyMode ?? 'default';
  const isBypass = applyMode === 'bypass';

  return createElement(
    'div',
    { style: { flexShrink: 0, padding: '6px 10px 8px' } },
    createElement(
      'div',
      {
        style: {
          position: 'relative',
          border: '1px solid var(--border-color, #3c3c3c)',
          borderRadius: '6px',
          background: 'var(--bg-secondary, #252526)',
          display: 'flex',
          flexDirection: 'column' as const,
        },
      },
      // Tip line (only when empty)
      messagesEmpty
        ? createElement(
            'div',
            {
              style: { padding: '6px 10px 0', fontSize: '11px', color: 'var(--text-muted, #666)' },
            },
            tipHint,
          )
        : null,
      // Slash command popup
      showSlashPopup
        ? createElement(SlashCommandPopup, {
            filter: slashFilter,
            onSelect: handleSlashSelect,
            selectedIndex: slashSelectedIndex,
          })
        : null,
      // Textarea
      createElement('textarea', {
        ref: inputRef,
        value: input,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(e.target.value),
        onCompositionStart: () => setIsComposing(true),
        onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => {
          setIsComposing(false);
          handleInputChange(e.currentTarget.value);
        },
        onKeyDown: handleKeyDown,
        placeholder,
        rows: 2,
        disabled: isLoading,
        style: {
          width: '100%',
          padding: '8px 10px 4px',
          fontSize: '13px',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-primary, #e0e0e0)',
          resize: 'none',
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box' as const,
        },
      }),
      // Bottom row: model selector + apply mode + send/stop
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 6px 4px',
          },
        },
        createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          config
            ? createElement(ModelSelectorView, {
                config,
                activeProvider: selectedProvider,
                onSelect: (p: string) => callbacks.onSelectProvider(p),
              })
            : null,
          // Apply mode toggle pill
          createElement(
            'button',
            {
              onClick: () => callbacks.onToggleApplyMode(),
              title: isBypass ? labels.autoTooltip : labels.manualTooltip,
              style: {
                display: 'flex',
                alignItems: 'center',
                height: '16px',
                padding: '0 6px',
                border: `1px solid ${isBypass ? 'var(--accent-color, #4a9eff)' : 'var(--border-color, #444)'}`,
                borderRadius: '8px',
                background: isBypass ? 'rgba(74,158,255,0.15)' : 'transparent',
                color: isBypass ? 'var(--accent-color, #4a9eff)' : 'var(--text-muted, #666)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                cursor: 'pointer',
                userSelect: 'none' as const,
                flexShrink: 0,
              },
            },
            isBypass ? labels.autoLabel : labels.manualLabel,
          ),
        ),
        // Send / Stop button
        isLoading
          ? createElement(
              'button',
              {
                onClick: () => callbacks.onStop(),
                title: labels.stop,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  border: '1.5px solid var(--text-muted, #666)',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary, #2d2d2d)',
                  color: 'var(--text-secondary, #ccc)',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                },
              },
              createElement(Square, { size: 8, fill: 'currentColor' }),
            )
          : createElement(
              'button',
              {
                onClick: handleSend,
                disabled: isComposing || !input.trim(),
                title: labels.send,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  border: 'none',
                  borderRadius: 0,
                  background: 'transparent',
                  color: 'var(--text-primary, #e0e0e0)',
                  cursor: !input.trim() ? 'default' : 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  opacity: !input.trim() ? 0.3 : 1,
                  transition: 'opacity 0.15s',
                },
              },
              createElement(ArrowUp, { size: 16, strokeWidth: 2 }),
            ),
      ),
    ),
  );
}
