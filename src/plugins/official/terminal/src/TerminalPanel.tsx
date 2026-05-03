import React from 'react';
import { useTerminalManager } from './useTerminalManager';
import { TerminalInstance } from './TerminalInstance';
import { TerminalListSidebar } from './TerminalListSidebar';
import { NewTerminalButton } from './NewTerminalButton';

interface TerminalPanelProps {
  context: import('../../../plugin-sandbox').PluginContext;
}

/**
 * Multi-terminal panel component (VS Code style).
 * Displays multiple terminal instances with a right sidebar list.
 */
export const TerminalPanel: React.FC<TerminalPanelProps> = ({ context: _context }) => {
  const {
    terminals,
    activeTerminalId,
    createTerminal,
    deleteTerminal,
    renameTerminal,
    setActiveTerminal,
    updateTerminalRefs,
  } = useTerminalManager();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary, #1e1e2e)',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '4px 8px',
          borderBottom: '1px solid var(--border-color, #333)',
          backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
          fontSize: '12px',
        }}
      >
        <span
          style={{
            color: 'var(--text-secondary, #666)',
            fontSize: '11px',
          }}
        >
          Commands are whitelisted for security
        </span>
        
        {/* New Terminal Button */}
        <NewTerminalButton onCreateTerminal={createTerminal} />
      </div>

      {/* Main content: terminals + sidebar */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Terminal display area */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {terminals.map((terminal) => (
            <TerminalInstance
              key={terminal.id}
              instance={terminal}
              isActive={terminal.id === activeTerminalId}
              onUpdateRefs={updateTerminalRefs}
            />
          ))}
        </div>

        {/* Right sidebar - terminal list */}
        <TerminalListSidebar
          terminals={terminals}
          activeTerminalId={activeTerminalId}
          onSelectTerminal={setActiveTerminal}
          onDeleteTerminal={deleteTerminal}
          onRenameTerminal={renameTerminal}
        />
      </div>
    </div>
  );
};
