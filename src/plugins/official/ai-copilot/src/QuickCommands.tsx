import { createElement, useEffect, useRef } from 'react';
import { getQuickCommandList } from './intent-parser';
import { useI18n } from '../../../../i18n';
import type { TranslationKey } from '../../../../i18n';

interface SlashCommandPopupProps {
  filter: string;
  onSelect: (command: string) => void;
  selectedIndex?: number;
}

const CMD_KEYS: Record<string, { labelKey: TranslationKey; descKey: TranslationKey }> = {
  '/new':      { labelKey: 'aiCopilot.cmd.new',      descKey: 'aiCopilot.cmd.new.desc'      },
  '/polish':   { labelKey: 'aiCopilot.cmd.polish',   descKey: 'aiCopilot.cmd.polish.desc'   },
  '/explain':  { labelKey: 'aiCopilot.cmd.explain',  descKey: 'aiCopilot.cmd.explain.desc'  },
  '/rewrite':  { labelKey: 'aiCopilot.cmd.rewrite',  descKey: 'aiCopilot.cmd.rewrite.desc'  },
  '/summarize':{ labelKey: 'aiCopilot.cmd.summarize', descKey: 'aiCopilot.cmd.summarize.desc' },
  '/translate':{ labelKey: 'aiCopilot.cmd.translate', descKey: 'aiCopilot.cmd.translate.desc' },
  '/format':   { labelKey: 'aiCopilot.cmd.format',   descKey: 'aiCopilot.cmd.format.desc'   },
  '/insert':   { labelKey: 'aiCopilot.cmd.insert',   descKey: 'aiCopilot.cmd.insert.desc'   },
  '/delete':   { labelKey: 'aiCopilot.cmd.delete',   descKey: 'aiCopilot.cmd.delete.desc'   },
  '/todo':     { labelKey: 'aiCopilot.cmd.todo',     descKey: 'aiCopilot.cmd.todo.desc'     },
  '/expand':   { labelKey: 'aiCopilot.cmd.expand',   descKey: 'aiCopilot.cmd.expand.desc'   },
  '/toc':      { labelKey: 'aiCopilot.cmd.toc',      descKey: 'aiCopilot.cmd.toc.desc'      },
  '/lint':     { labelKey: 'aiCopilot.cmd.lint',     descKey: 'aiCopilot.cmd.lint.desc'     },
  '/fix-links': { labelKey: 'aiCopilot.cmd.fixLinks', descKey: 'aiCopilot.cmd.fixLinks.desc' },
  '/table-format': { labelKey: 'aiCopilot.cmd.tableFormat', descKey: 'aiCopilot.cmd.tableFormat.desc' },
  '/heading-promote': { labelKey: 'aiCopilot.cmd.headingPromote', descKey: 'aiCopilot.cmd.headingPromote.desc' },
};

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function getSlashCommandToken(input: string): string | null {
  const match = input.match(/^\/(\S*)$/);
  return match ? match[1] : null;
}

function getLocalizedCommands(t: TranslateFn) {
  return getQuickCommandList().map((command) => {
    const keys = CMD_KEYS[command.command];
    return {
      ...command,
      label: keys ? t(keys.labelKey) : command.label,
      description: keys ? t(keys.descKey) : command.description,
    };
  });
}

function filterCommands(
  commands: Array<{ command: string; label: string; description: string }>,
  filter: string,
) {
  const normalizedFilter = filter.trim().replace(/^\//, '').toLowerCase();
  if (!normalizedFilter) return commands;

  return commands.filter(
    (command) =>
      command.command.includes(normalizedFilter) ||
      command.label.toLowerCase().includes(normalizedFilter) ||
      command.description.toLowerCase().includes(normalizedFilter),
  );
}

/**
 * Slash command popup — shown above the input when user types '/'.
 * Filters commands based on what follows the slash.
 */
export function SlashCommandPopup({ filter, onSelect, selectedIndex = 0 }: SlashCommandPopupProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = filterCommands(getLocalizedCommands(t), filter);

  // Scroll selected item into view
  useEffect(() => {
    if (filtered.length > 0 && selectedIndex >= 0 && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [filtered.length, selectedIndex]);

  if (filtered.length === 0) return null;

  return createElement(
    'div',
    {
      ref: containerRef,
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
    ...filtered.map((cmd, idx) =>
      createElement(
        'button',
        {
          key: cmd.command,
          'data-index': idx,
          onClick: () => onSelect(cmd.command + ' '),
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '6px 10px',
            fontSize: '12px',
            border: 'none',
            borderLeft: idx === selectedIndex ? '2px solid var(--accent-color, #0969da)' : '2px solid transparent',
            borderBottom: '1px solid var(--border-color, #2a2a2a)',
            background: idx === selectedIndex ? 'var(--accent-bg, rgba(59,130,246,0.12))' : 'transparent',
            color: 'var(--text-primary, #e0e0e0)',
            cursor: 'pointer',
            textAlign: 'left',
          },
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = idx === selectedIndex
              ? 'var(--accent-bg, rgba(59,130,246,0.12))'
              : 'var(--hover-bg, rgba(128,128,128,0.1))';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = idx === selectedIndex ? 'var(--accent-bg, rgba(59,130,246,0.12))' : 'transparent';
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

/** Return the number of commands matching the current filter. */
export function getFilteredCommandCount(filter: string, t: TranslateFn): number {
  return filterCommands(getLocalizedCommands(t), filter).length;
}

/** Return the command string at a given index in the filtered list. */
export function getFilteredCommandAt(filter: string, index: number, t: TranslateFn): string | undefined {
  return filterCommands(getLocalizedCommands(t), filter)[index]?.command;
}
