import { createElement } from 'react';
import { getQuickCommandList } from './intent-parser';

interface SlashCommandPopupProps {
  filter: string;
  onSelect: (command: string) => void;
}

/**
 * Slash command popup — shown above the input when user types '/'.
 * Filters commands based on what follows the slash.
 */
export function SlashCommandPopup({ filter, onSelect }: SlashCommandPopupProps) {
  const commands = getQuickCommandList();
  const filtered = filter
    ? commands.filter(
        (c) =>
          c.command.includes(filter.toLowerCase()) ||
          c.label.includes(filter) ||
          c.description.toLowerCase().includes(filter.toLowerCase()),
      )
    : commands;

  if (filtered.length === 0) return null;

  return createElement(
    'div',
    {
      style: {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        background: 'var(--bg-secondary, #252526)',
        border: '1px solid var(--border-color, #3c3c3c)',
        borderRadius: '4px',
        marginBottom: '4px',
        maxHeight: '200px',
        overflow: 'auto',
        zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
      },
    },
    ...filtered.map((cmd) =>
      createElement(
        'button',
        {
          key: cmd.command,
          onClick: () => onSelect(cmd.command + ' '),
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '6px 10px',
            fontSize: '12px',
            border: 'none',
            borderBottom: '1px solid var(--border-color, #2a2a2a)',
            background: 'transparent',
            color: 'var(--text-primary, #e0e0e0)',
            cursor: 'pointer',
            textAlign: 'left',
          },
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'var(--hover-bg, rgba(255,255,255,0.06))';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          },
        },
        createElement(
          'span',
          { style: { fontFamily: 'monospace', color: 'var(--accent-color, #4a9eff)' } },
          cmd.command,
        ),
        createElement(
          'span',
          {
            style: {
              fontSize: '11px',
              color: 'var(--text-muted, #888)',
              marginTop: '1px',
            },
          },
          cmd.description,
        ),
      ),
    ),
  );
}
