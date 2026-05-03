import React from 'react';

/**
 * Get the icon element for a shell type.
 * Returns a React element displaying the appropriate icon.
 */
export function getShellIcon(shellType: string): React.ReactElement {
  switch (shellType) {
    case 'cmd':
      return <span style={{ fontSize: '14px', fontWeight: 'bold' }}>⚡</span>;
    
    case 'powershell':
    case 'pwsh':
      return (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            padding: '2px 3px',
            borderRadius: '2px',
            backgroundColor: 'rgba(74, 158, 255, 0.2)',
            color: 'var(--accent-color, #4a9eff)',
          }}
        >
          PS
        </span>
      );
    
    case 'bash':
    case 'git-bash':
      return <span style={{ fontSize: '14px' }}>🐚</span>;
    
    case 'sh':
    default:
      return (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            color: 'var(--text-secondary, #888)',
          }}
        >
          $
        </span>
      );
  }
}

/**
 * Get a text-only representation of the shell type icon.
 * Used for accessibility or fallback.
 */
export function getShellIconText(shellType: string): string {
  switch (shellType) {
    case 'cmd':
      return '⚡';
    case 'powershell':
    case 'pwsh':
      return 'PS';
    case 'bash':
    case 'git-bash':
      return '🐚';
    case 'sh':
    default:
      return '$';
  }
}
