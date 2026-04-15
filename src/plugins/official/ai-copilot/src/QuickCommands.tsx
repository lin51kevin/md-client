import { createElement } from 'react';
import { getQuickCommandList } from './intent-parser';
import { useI18n } from '../../../../i18n';
import type { TranslationKey } from '../../../../i18n';

interface SlashCommandPopupProps {
  filter: string;
  onSelect: (command: string) => void;
}

const CMD_KEYS: Record<string, { labelKey: TranslationKey; descKey: TranslationKey }> = {
  '/explain':  { labelKey: 'aiCopilot.cmd.explain',  descKey: 'aiCopilot.cmd.explain.desc'  },
  '/rewrite':  { labelKey: 'aiCopilot.cmd.rewrite',  descKey: 'aiCopilot.cmd.rewrite.desc'  },
  '/summarize':{ labelKey: 'aiCopilot.cmd.summarize', descKey: 'aiCopilot.cmd.summarize.desc' },
  '/translate':{ labelKey: 'aiCopilot.cmd.translate', descKey: 'aiCopilot.cmd.translate.desc' },
  '/format':   { labelKey: 'aiCopilot.cmd.format',   descKey: 'aiCopilot.cmd.format.desc'   },
  '/todo':     { labelKey: 'aiCopilot.cmd.todo',     descKey: 'aiCopilot.cmd.todo.desc'     },
  '/expand':   { labelKey: 'aiCopilot.cmd.expand',   descKey: 'aiCopilot.cmd.expand.desc'   },
};

/**
 * Slash command popup — shown above the input when user types '/'.
 * Filters commands based on what follows the slash.
 */
export function SlashCommandPopup({ filter, onSelect }: SlashCommandPopupProps) {
  const { t } = useI18n();
  const rawCommands = getQuickCommandList();

  const commands = rawCommands.map((c) => {
    const keys = CMD_KEYS[c.command];
    return keys
      ? { ...c, label: t(keys.labelKey), description: t(keys.descKey) }
      : c;
  });

  const filtered = filter
    ? commands.filter(
        (c) =>
          c.command.includes(filter.toLowerCase()) ||
          c.label.toLowerCase().includes(filter.toLowerCase()) ||
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
