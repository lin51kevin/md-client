import { useState, useCallback, useEffect } from 'react';
import type { TerminalInstance } from './types';

/**
 * Hook to manage multiple terminal instances.
 * Handles creation, deletion, switching, and renaming of terminals.
 */
export function useTerminalManager() {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);

  // Get initial working directory from file tree root
  const getInitialCwd = useCallback((): string => {
    try {
      // Try to get file tree root from localStorage
      const fileTreeRoot = localStorage.getItem('marklite-filetree-root');
      if (fileTreeRoot) {
        return fileTreeRoot;
      }
    } catch {
      // Fallback if localStorage is not available
    }
    return '';
  }, []);

  // Get default shell type based on platform
  const getDefaultShellType = useCallback((): string => {
    if (typeof navigator !== 'undefined' && navigator.platform) {
      if (navigator.platform.toLowerCase().includes('win')) {
        return 'cmd';
      }
    }
    return 'sh';
  }, []);

  // Auto-create first terminal on mount
  useEffect(() => {
    if (terminals.length === 0) {
      const defaultShellType = getDefaultShellType();
      const initialCwd = getInitialCwd();
      const firstTerminal: TerminalInstance = {
        id: 'terminal-1',
        name: 'Terminal 1',
        shellType: defaultShellType,
        cwd: initialCwd,
        termRef: null,
        fitAddonRef: null,
        inputBuffer: '',
        createdAt: Date.now(),
      };
      setTerminals([firstTerminal]);
      setActiveTerminalId('terminal-1');
      setNextId(2);
    }
  }, []); // Only run once on mount

  /**
   * Create a new terminal with the specified shell type.
   */
  const createTerminal = useCallback((shellType: string) => {
    const id = `terminal-${nextId}`;
    const initialCwd = getInitialCwd();
    const newTerminal: TerminalInstance = {
      id,
      name: `Terminal ${nextId}`,
      shellType,
      cwd: initialCwd,
      termRef: null,
      fitAddonRef: null,
      inputBuffer: '',
      createdAt: Date.now(),
    };
    
    setTerminals((prev) => [...prev, newTerminal]);
    setActiveTerminalId(id);
    setNextId((n) => n + 1);
    
    return id;
  }, [nextId, getInitialCwd]);

  /**
   * Delete a terminal by ID.
   * Ensures at least one terminal remains.
   */
  const deleteTerminal = useCallback((id: string) => {
    setTerminals((prev) => {
      // Don't delete if it's the last terminal
      if (prev.length <= 1) {
        return prev;
      }

      const index = prev.findIndex((t) => t.id === id);
      if (index === -1) return prev;

      // Clean up terminal instance
      const terminal = prev[index];
      if (terminal.termRef) {
        terminal.termRef.dispose();
      }

      const newTerminals = prev.filter((t) => t.id !== id);

      // If we deleted the active terminal, switch to another
      if (activeTerminalId === id) {
        // Switch to the previous terminal, or the first one if we deleted the first
        const newActiveIndex = index > 0 ? index - 1 : 0;
        setActiveTerminalId(newTerminals[newActiveIndex]?.id || null);
      }

      return newTerminals;
    });
  }, [activeTerminalId]);

  /**
   * Rename a terminal.
   */
  const renameTerminal = useCallback((id: string, newName: string) => {
    setTerminals((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName } : t))
    );
  }, []);

  /**
   * Set the active terminal.
   */
  const setActiveTerminal = useCallback((id: string) => {
    setActiveTerminalId(id);
  }, []);

  /**
   * Update terminal instance refs (called by TerminalInstance component).
   */
  const updateTerminalRefs = useCallback((
    id: string,
    updates: Partial<Pick<TerminalInstance, 'termRef' | 'fitAddonRef' | 'inputBuffer' | 'cwd'>>
  ) => {
    setTerminals((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  // Get active terminal
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId) || null;

  return {
    terminals,
    activeTerminalId,
    activeTerminal,
    createTerminal,
    deleteTerminal,
    renameTerminal,
    setActiveTerminal,
    updateTerminalRefs,
  };
}
