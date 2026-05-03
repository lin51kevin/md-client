import React, { useState, useRef, useEffect } from 'react';
import { SHELL_TYPES } from './types';
import { getShellIcon } from './shellIcons';

interface NewTerminalButtonProps {
  onCreateTerminal: (shellType: string) => void;
  defaultShellType?: string;
  onSetDefault?: (shellType: string) => void;
}

/**
 * Button with dropdown menu for creating new terminals.
 * Allows user to select shell type before creation.
 */
export const NewTerminalButton: React.FC<NewTerminalButtonProps> = ({ onCreateTerminal, defaultShellType, onSetDefault }) => {
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
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        title="New Terminal"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          padding: '0 6px',
          height: 22,
          border: 'none',
          borderRadius: '3px',
          backgroundColor: 'transparent',
          color: 'var(--text-secondary, #ccc)',
          cursor: 'pointer',
          lineHeight: '22px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.1))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '22px' }}>+</span>
        <span style={{ fontSize: '7px', lineHeight: '22px', opacity: 0.6 }}>▼</span>
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
          {SHELL_TYPES.map((shellType) => {
            const isDefault = shellType.value === defaultShellType;
            return (
            <div
              key={shellType.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0',
              }}
            >
              <button
                onClick={() => handleCreate(shellType.value)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px 6px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary, #ccc)',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(74,158,255,0.1))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ flexShrink: 0, width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getShellIcon(shellType.value)}
                </div>
                <span style={{ flex: 1 }}>{shellType.label}</span>
              </button>
              {/* Set as default button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault?.(shellType.value);
                }}
                title={isDefault ? 'Default terminal' : 'Set as default terminal'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  marginRight: 4,
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: 'transparent',
                  color: isDefault ? 'var(--accent-color, #4a9eff)' : 'var(--text-tertiary, #555)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  opacity: isDefault ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.1))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = isDefault ? '1' : '0.5';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L9.6 5.2L13.2 5.8L10.6 8.3L11.2 11.9L8 10.2L4.8 11.9L5.4 8.3L2.8 5.8L6.4 5.2L8 2Z"
                    fill={isDefault ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
