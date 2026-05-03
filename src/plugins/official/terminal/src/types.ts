import type { Terminal } from 'xterm';
import type { FitAddon } from '@xterm/addon-fit';

/**
 * Represents a single terminal instance with its state.
 */
export interface TerminalInstance {
  /** Unique identifier for this terminal */
  id: string;
  
  /** Display name (user can rename) */
  name: string;
  
  /** Shell type (cmd, powershell, pwsh, bash, sh) */
  shellType: string;
  
  /** Current working directory */
  cwd: string;
  
  /** xterm.js Terminal instance */
  termRef: Terminal | null;
  
  /** FitAddon instance for terminal resizing */
  fitAddonRef: FitAddon | null;
  
  /** Input buffer for the current command line */
  inputBuffer: string;
  
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Shell type options for terminal creation.
 */
export const SHELL_TYPES = [
  { value: 'cmd', label: 'CMD (Windows)', icon: '⚡' },
  { value: 'powershell', label: 'PowerShell', icon: 'PS' },
  { value: 'pwsh', label: 'PowerShell Core', icon: 'PS' },
  { value: 'bash', label: 'Bash / Git Bash', icon: '🐚' },
  { value: 'sh', label: 'sh (Unix/Linux)', icon: '$' },
] as const;

export type ShellType = typeof SHELL_TYPES[number]['value'];
