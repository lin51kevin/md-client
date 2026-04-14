import { createElement } from 'react';

interface DiffPreviewProps {
  original: string;
  modified: string;
}

export function DiffPreviewView({ original, modified }: DiffPreviewProps) {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  return createElement(
    'div',
    {
      style: {
        border: '1px solid var(--border-color, #3c3c3c)',
        borderRadius: '4px',
        overflow: 'hidden',
        margin: '8px 0',
        fontSize: '12px',
        fontFamily: 'var(--font-mono, monospace)',
      },
    },
    // Header
    createElement(
      'div',
      {
        style: {
          padding: '4px 8px',
          background: 'var(--bg-tertiary, #1a1a1a)',
          borderBottom: '1px solid var(--border-color, #3c3c3c)',
          fontSize: '11px',
          color: 'var(--text-muted, #888)',
          fontFamily: 'inherit',
        },
      },
      'Changes',
    ),
    // Diff body
    createElement(
      'div',
      {
        style: {
          padding: '4px 0',
          maxHeight: '200px',
          overflow: 'auto',
        },
      },
      // Original lines (removed)
      ...origLines.map((line, i) =>
        createElement(
          'div',
          {
            key: `del-${i}`,
            style: {
              background: 'rgba(255, 80, 80, 0.12)',
              color: '#f48771',
              padding: '0 8px',
              whiteSpace: 'pre-wrap',
              lineHeight: '20px',
            },
          },
          `- ${line}`,
        ),
      ),
      // Modified lines (added)
      ...modLines.map((line, i) =>
        createElement(
          'div',
          {
            key: `add-${i}`,
            style: {
              background: 'rgba(80, 200, 80, 0.12)',
              color: '#73c991',
              padding: '0 8px',
              whiteSpace: 'pre-wrap',
              lineHeight: '20px',
            },
          },
          `+ ${line}`,
        ),
      ),
    ),
  );
}
