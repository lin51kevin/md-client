import React from 'react';

const iconStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

/**
 * VS Code-style shell icons as inline SVGs.
 */
export function getShellIcon(shellType: string): React.ReactElement {
  switch (shellType) {
    case 'bash':
    case 'git-bash':
      // Git Bash diamond icon (VS Code style)
      return (
        <span style={iconStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14.5 8L8 15L1.5 8L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">$</text>
          </svg>
        </span>
      );

    case 'powershell':
    case 'pwsh':
      // PowerShell icon (VS Code style - rectangle with >_)
      return (
        <span style={iconStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 6L7 8.5L4 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="8.5" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      );

    case 'wsl':
      // WSL penguin icon
      return (
        <span style={iconStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <ellipse cx="8" cy="9" rx="4" ry="5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <circle cx="6.5" cy="7.5" r="0.8" fill="currentColor" />
            <circle cx="9.5" cy="7.5" r="0.8" fill="currentColor" />
            <path d="M7 10L8 11L9 10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M4.5 6.5C3.5 5 4 3 6 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
            <path d="M11.5 6.5C12.5 5 12 3 10 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      );

    case 'cmd':
      // CMD icon (VS Code style - bracket with >_)
      return (
        <span style={iconStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4.5 6L7.5 8.5L4.5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
      );

    default:
      return (
        <span style={{ ...iconStyle, fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color: 'currentColor' }}>
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
