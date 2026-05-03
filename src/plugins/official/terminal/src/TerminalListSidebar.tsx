import React, { useState, useRef, useEffect } from 'react';
import type { TerminalInstance } from './types';
import { getShellIcon } from './shellIcons';
import { NewTerminalButton } from './NewTerminalButton';

interface TerminalListSidebarProps {
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
  onSelectTerminal: (id: string) => void;
  onDeleteTerminal: (id: string) => void;
  onRenameTerminal: (id: string, newName: string) => void;
  onCreateTerminal: (shellType: string) => void;
}

/**
 * Right sidebar displaying the list of terminal instances.
 * Each item shows: shell icon + name + delete button.
 * Click to switch, double-click name to rename.
 */
export const TerminalListSidebar: React.FC<TerminalListSidebarProps> = ({
  terminals,
  activeTerminalId,
  onSelectTerminal,
  onDeleteTerminal,
  onRenameTerminal,
  onCreateTerminal,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (terminal: TerminalInstance) => {
    setEditingId(terminal.id);
    setEditingName(terminal.name);
  };

  const finishEditing = () => {
    if (editingId && editingName.trim()) {
      onRenameTerminal(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div
      style={{
        width: '200px',
        borderLeft: '1px solid var(--border-color, #333)',
        backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px',
          borderBottom: '1px solid var(--border-color, #333)',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--text-secondary, #888)',
        }}
      >
        <span>Terminal</span>
        <NewTerminalButton onCreateTerminal={onCreateTerminal} />
      </div>

      {/* Terminal list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '4px',
        }}
      >
        {terminals.map((terminal) => {
          const isActive = terminal.id === activeTerminalId;
          const isEditing = editingId === terminal.id;

          return (
            <div
              key={terminal.id}
              onClick={() => !isEditing && onSelectTerminal(terminal.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                marginBottom: '2px',
                borderRadius: '4px',
                backgroundColor: isActive ? 'var(--accent-color-dim, rgba(74,158,255,0.15))' : 'transparent',
                border: isActive ? '1px solid var(--accent-color, #4a9eff)' : '1px solid transparent',
                cursor: isEditing ? 'text' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isEditing) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Shell icon */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {getShellIcon(terminal.shellType)}
              </div>

              {/* Name (editable on double-click) */}
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={finishEditing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      finishEditing();
                    } else if (e.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: '12px',
                    padding: '2px 4px',
                    border: '1px solid var(--accent-color, #4a9eff)',
                    borderRadius: '2px',
                    backgroundColor: 'var(--bg-primary, #1e1e1e)',
                    color: 'var(--text-primary, #fff)',
                    outline: 'none',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(terminal);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: '12px',
                    color: isActive ? 'var(--accent-color, #4a9eff)' : 'var(--text-primary, #ccc)',
                    fontWeight: isActive ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={terminal.name}
                >
                  {terminal.name}
                </div>
              )}

              {/* Delete button */}
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTerminal(terminal.id);
                  }}
                  disabled={terminals.length <= 1}
                  title={terminals.length <= 1 ? 'Cannot delete last terminal' : 'Delete terminal'}
                  style={{
                    flexShrink: 0,
                    width: '16px',
                    height: '16px',
                    padding: 0,
                    border: 'none',
                    borderRadius: '2px',
                    backgroundColor: 'transparent',
                    color: terminals.length <= 1 ? 'var(--text-tertiary, #555)' : 'var(--text-secondary, #888)',
                    fontSize: '12px',
                    cursor: terminals.length <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: terminals.length <= 1 ? 0.3 : 0.7,
                  }}
                  onMouseEnter={(e) => {
                    if (terminals.length > 1) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,100,100,0.2)';
                      e.currentTarget.style.color = '#ff6464';
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary, #888)';
                    e.currentTarget.style.opacity = terminals.length <= 1 ? '0.3' : '0.7';
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
