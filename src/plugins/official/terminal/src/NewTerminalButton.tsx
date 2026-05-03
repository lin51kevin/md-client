import React, { useState, useRef, useEffect } from 'react';
import { SHELL_TYPES } from './types';
import { getShellIcon } from './shellIcons';

interface NewTerminalButtonProps {
  onCreateTerminal: (shellType: string) => void;
}

/**
 * Button with dropdown menu for creating new terminals.
 * Allows user to select shell type before creation.
 */
export const NewTerminalButton: React.FC<NewTerminalButtonProps> = ({ onCreateTerminal }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleCreate = (shellType: string) => {
    onCreateTerminal(shellType);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        title="New Terminal"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          border: '1px solid var(--border-color, #444)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-secondary, #2a2a2a)',
          color: 'var(--text-primary, #fff)',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.1))';
          e.currentTarget.style.borderColor = 'var(--accent-color, #4a9eff)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #2a2a2a)';
          e.currentTarget.style.borderColor = 'var(--border-color, #444)';
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>+</span>
        <span>New Terminal</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '180px',
            backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
            border: '1px solid var(--border-color, #444)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {SHELL_TYPES.map((shellType) => (
            <button
              key={shellType.value}
              onClick={() => handleCreate(shellType.value)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-primary, #ccc)',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(74,158,255,0.1))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ flexShrink: 0, width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getShellIcon(shellType.value)}
              </div>
              <span>{shellType.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
