import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import xtermCss from 'xterm/css/xterm.css?raw';
import type { TerminalInstance as TerminalInstanceType } from './types';
import { toNativePath, resolvePath, extractCdTarget, buildCompletionFullName, buildCompletionDisplayName } from './terminalUtils';

interface TerminalInstanceProps {
  instance: TerminalInstanceType;
  isActive: boolean;
  onUpdateRefs: (id: string, updates: Partial<Pick<TerminalInstanceType, 'termRef' | 'fitAddonRef' | 'inputBuffer' | 'cwd'>>) => void;
}

/** Track which terminal IDs have been initialized to prevent double-init. */
const initializedTerminals = new Set<string>();

/** Read a CSS variable value from the document root. */
function getCSSVar(name: string, fallback: string): string {
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

/** Detect whether the current theme has a dark background. */
function isDarkTheme(): boolean {
  const bg = getCSSVar('--bg-primary', '#ffffff');
  const hex = bg.replace('#', '').slice(0, 6);
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return false;
}

const DARK_ANSI = {
  green: '#a6e3a1', red: '#f38ba8', yellow: '#f9e2af',
  blue: '#89b4fa', magenta: '#cba6f7', cyan: '#94e2d5',
  white: '#cdd6f4', brightBlack: '#585b70',
};
const LIGHT_ANSI = {
  green: '#1a7f37', red: '#cf222e', yellow: '#9a6700',
  blue: '#0969da', magenta: '#8250df', cyan: '#0e7c86',
  white: '#1f2328', brightBlack: '#656d76',
};

function buildThemeFromCSS(): Record<string, string> {
  const dark = isDarkTheme();
  const ansi = dark ? DARK_ANSI : LIGHT_ANSI;
  return {
    background: getCSSVar('--bg-primary', dark ? '#0d1117' : '#ffffff'),
    foreground: getCSSVar('--text-primary', dark ? '#f0f6fc' : '#1f2328'),
    cursor: getCSSVar('--accent-color', dark ? '#58a6ff' : '#0969da'),
    cursorAccent: getCSSVar('--bg-primary', dark ? '#0d1117' : '#ffffff'),
    selectionBackground: getCSSVar('--selection-bg', dark ? 'rgba(88,166,255,0.5)' : '#d7d4f0'),
    green: ansi.green,
    red: ansi.red,
    yellow: ansi.yellow,
    blue: ansi.blue,
    magenta: ansi.magenta,
    cyan: ansi.cyan,
    white: ansi.white,
    brightBlack: ansi.brightBlack,
  };
}

/**
 * Component for a single xterm.js terminal instance.
 * Handles initialization, event handling, fit, and cleanup.
 */
export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ instance, isActive, onUpdateRefs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputBufferRef = useRef<string>(instance.inputBuffer);
  const cwdRef = useRef<string>(instance.cwd);

  // Update cwdRef when instance.cwd changes
  useEffect(() => {
    cwdRef.current = instance.cwd;
  }, [instance.cwd]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;
    // Prevent double initialization (the old code would dispose the terminal
    // because instance.termRef was in the dep array, causing a re-run after
    // onUpdateRefs set termRef, which triggered cleanup → dispose).
    if (initializedTerminals.has(instance.id)) return;
    initializedTerminals.add(instance.id);

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, Monaco, monospace',
      theme: buildThemeFromCSS(),
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Inject xterm CSS (only once per document, shared by all terminals)
    if (!document.querySelector('[data-xterm-css="marklite-terminal"]')) {
      const style = document.createElement('style');
      style.setAttribute('data-xterm-css', 'marklite-terminal');
      style.textContent = xtermCss;
      document.head.appendChild(style);
      // Don't store in styleRef since we don't want to remove it on cleanup
    }

    term.open(containerRef.current);

    setTimeout(() => {
      if (!containerRef.current || containerRef.current.offsetParent === null) return;
      try {
        fitAddon.fit();
      } catch {
        // Container may not be ready
      }
    }, 100);

    // Update parent state with refs
    onUpdateRefs(instance.id, { termRef: term, fitAddonRef: fitAddon });

    // Helper functions defined inside useEffect to avoid stale closures
    const writeOutput = (text: string) => {
      term.write(text);
      term.scrollToBottom();
    };

    const writePrompt = () => {
      const cwd = cwdRef.current;
      const shell = instance.shellType;

      if (shell === 'cmd') {
        // CMD style: F:\path>
        const winPath = cwd ? cwd.replace(/\//g, '\\') : 'C:\\';
        writeOutput(`\r\n${winPath}>`);
      } else if (shell === 'powershell' || shell === 'pwsh') {
        // PowerShell style: PS F:\path>
        const winPath = cwd ? cwd.replace(/\//g, '\\') : 'C:\\';
        writeOutput(`\x1b[34mPS\x1b[0m ${winPath}> `);
      } else {
        // Bash / WSL style: /f/path $
        let displayPath = '~';
        if (cwd) {
          let normalizedPath = cwd.replace(/\\/g, '/');
          normalizedPath = normalizedPath.replace(/^([A-Z]):/i, (_, drive: string) => `/${drive.toLowerCase()}`);
          displayPath = normalizedPath || '/';
        }
        writeOutput(`\x1b[36m${displayPath}\x1b[0m $ `);
      }
      inputBufferRef.current = '';
      onUpdateRefs(instance.id, { inputBuffer: '' });
    };

    // Directory stack for pushd/popd and OLDPWD for cd -
    const dirStack: string[] = [];
    let prevDir = '';

    // Path utilities are imported from terminalUtils.ts (toNativePath, resolvePath, extractCdTarget)

    /**
     * Change the tracked cwd to `resolved`, saving the old value as prevDir.
     */
    const applyNewCwd = (resolved: string) => {
      prevDir = cwdRef.current;
      cwdRef.current = resolved;
      onUpdateRefs(instance.id, { cwd: resolved });
    };

    /**
     * Validate that `resolved` is an existing directory via the backend.
     * Returns true if it exists, false otherwise.
     */
    const validateDir = async (resolved: string): Promise<boolean> => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<boolean>('is_directory', { path: resolved });
      } catch {
        return false;
      }
    };

    /**
     * Handle cd/pushd/popd commands client-side, updating cwdRef.
     * Returns true if the command was a directory command (handled), false otherwise.
     */
    const handleDirectoryCommand = async (trimmed: string): Promise<boolean> => {
      // --- cd / chdir / drive switch ---
      const cdTarget = extractCdTarget(trimmed);
      if (cdTarget !== null) {
        // "cd -" → restore OLDPWD
        if (cdTarget === '-') {
          if (!prevDir) {
            writeOutput(`\x1b[31mcd: OLDPWD not set\x1b[0m\r\n`);
          } else {
            const dest = prevDir;
            prevDir = cwdRef.current;
            cwdRef.current = dest;
            onUpdateRefs(instance.id, { cwd: dest });
            writeOutput(dest + '\r\n');
          }
          return true;
        }

        // Convert Unix-style absolute path to Windows path if needed
        const nativeTarget = toNativePath(cdTarget, cwdRef.current);
        const resolved = resolvePath(nativeTarget, cwdRef.current);

        // Validate existence before updating cwdRef
        const exists = await validateDir(resolved);
        if (!exists) {
          writeOutput(`\x1b[31mcd: ${cdTarget}: No such file or directory\x1b[0m\r\n`);
        } else {
          applyNewCwd(resolved);
        }
        return true;
      }

      // --- pushd ---
      const pushdMatch = trimmed.match(/^pushd\s+(.+)$/i);
      if (pushdMatch) {
        let target = pushdMatch[1].trim();
        if ((target.startsWith('"') && target.endsWith('"')) ||
            (target.startsWith("'") && target.endsWith("'"))) {
          target = target.slice(1, -1);
        }
        const nativeTarget = toNativePath(target, cwdRef.current);
        const resolved = resolvePath(nativeTarget, cwdRef.current);

        const exists = await validateDir(resolved);
        if (!exists) {
          writeOutput(`\x1b[31mcd: ${target}: No such file or directory\x1b[0m\r\n`);
        } else {
          dirStack.push(cwdRef.current);
          applyNewCwd(resolved);
        }
        return true;
      }

      // --- popd ---
      if (/^popd\s*$/i.test(trimmed)) {
        if (dirStack.length === 0) {
          writeOutput(`\x1b[31mDirectory stack is empty.\x1b[0m\r\n`);
        } else {
          applyNewCwd(dirStack.pop()!);
        }
        return true;
      }

      return false;
    };

    const executeCommand = async (command: string) => {
      writeOutput(`\r\n`);

      const trimmed = command.trim();
      if (!trimmed) {
        writePrompt();
        return;
      }

      if (trimmed === 'clear' || trimmed === 'cls') {
        term.clear();
        writePrompt();
        return;
      }

      if (trimmed === 'exit') {
        term.write('\r\n\x1b[33mTerminal session ended.\x1b[0m\r\n');
        inputBufferRef.current = '';
        onUpdateRefs(instance.id, { inputBuffer: '' });
        return;
      }

      // Handle directory-changing commands (cd, pushd, popd, drive switch)
      const handled = await handleDirectoryCommand(trimmed);
      if (handled) {
        writePrompt();
        return;
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<string>('execute_shell_command', {
          command: trimmed,
          cwd: cwdRef.current || undefined,
          shellType: instance.shellType,
        });
        if (result) {
          writeOutput(result);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        writeOutput(`\x1b[31mError: ${message}\x1b[0m\r\n`);
      }

      writePrompt();
    };

    writePrompt();

    // Copy selected text on Ctrl+C (when selection exists), paste on Ctrl+V
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          e.preventDefault();
          return;
        }
        // No selection → fall through to onData which sends \x03
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          if (text) {
            // Only take first line to avoid accidental multi-command execution
            const firstLine = text.split(/\r?\n/)[0];
            inputBufferRef.current += firstLine;
            onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
            term.write(firstLine);
          }
        }).catch(() => { /* clipboard read denied */ });
      }
    };
    const xtermEl = containerRef.current?.querySelector('.xterm') as HTMLElement | null;
    xtermEl?.addEventListener('keydown', handleKeydown, true);

    // Right-click paste
    const handleContextMenu = (e: MouseEvent) => {
      const selection = term.getSelection();
      if (selection) {
        // Copy selection on right-click if text is selected
        navigator.clipboard.writeText(selection);
        term.clearSelection();
      } else {
        // Paste on right-click if no selection (like Windows Terminal / PuTTY)
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          if (text) {
            const firstLine = text.split(/\r?\n/)[0];
            inputBufferRef.current += firstLine;
            onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
            term.write(firstLine);
          }
        }).catch(() => { /* clipboard read denied */ });
      }
    };
    xtermEl?.addEventListener('contextmenu', handleContextMenu);

    // Tab-completion state
    let lastTabCompletions: string[] = [];
    let lastTabIndex = -1;
    let lastTabPartial = '';
    let lastTabPrefix = ''; // the part of inputBuffer before the token being completed

    /**
     * Perform tab-completion on the current input buffer.
     * Completes file/directory names for the last whitespace-delimited token.
     */
    const handleTabCompletion = async () => {
      const input = inputBufferRef.current;

      // Find the token being completed (last whitespace-delimited segment)
      const lastSpaceIdx = input.lastIndexOf(' ');
      const partial = lastSpaceIdx === -1 ? input : input.slice(lastSpaceIdx + 1);
      const prefix = lastSpaceIdx === -1 ? '' : input.slice(0, lastSpaceIdx + 1);

      // If pressing Tab again on the same partial, cycle through results
      if (lastTabCompletions.length > 0 && partial === lastTabPartial && prefix === lastTabPrefix) {
        lastTabIndex = (lastTabIndex + 1) % lastTabCompletions.length;
        const completion = lastTabCompletions[lastTabIndex];
        // Erase current partial from terminal and input buffer
        const currentPartial = inputBufferRef.current.slice(prefix.length);
        if (currentPartial.length > 0) {
          term.write('\b \b'.repeat(currentPartial.length));
        }
        inputBufferRef.current = prefix + completion;
        onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
        term.write(completion);
        return;
      }

      // New completion request
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const entries = await invoke<Array<{ name: string; is_dir: boolean }>>('shell_tab_complete', {
          cwd: cwdRef.current || '',
          partial,
        });

        if (entries.length === 0) {
          lastTabCompletions = [];
          lastTabIndex = -1;
          return;
        }

        // Build completion strings (append separator for directories)
        const sep = (instance.shellType === 'bash' || instance.shellType === 'wsl') ? '/' : '\\';
        const completions = entries.map((e) =>
          buildCompletionFullName(e.name, e.is_dir, partial, sep)
        );

        lastTabCompletions = completions;
        lastTabPrefix = prefix;
        lastTabPartial = partial;
        lastTabIndex = 0;

        if (completions.length === 1) {
          // Single match — auto-complete
          const completion = completions[0];
          if (partial.length > 0) {
            term.write('\b \b'.repeat(partial.length));
          }
          inputBufferRef.current = prefix + completion;
          onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
          term.write(completion);
        } else {
          // Multiple matches — show list (basenames only, like real bash) and fill common prefix
          writeOutput('\r\n');
          for (let i = 0; i < completions.length; i++) {
            const entry = entries[i];
            const displayName = buildCompletionDisplayName(entry.name, entry.is_dir, sep);
            if (entry.is_dir) {
              writeOutput(`\x1b[34m${displayName}\x1b[0m  `);
            } else {
              writeOutput(`${displayName}  `);
            }
          }
          writeOutput('\r\n');

          // Find longest common prefix among completions
          let common = completions[0];
          for (let i = 1; i < completions.length; i++) {
            let j = 0;
            while (j < common.length && j < completions[i].length &&
                   common[j].toLowerCase() === completions[i][j].toLowerCase()) {
              j++;
            }
            common = common.slice(0, j);
          }

          // Redraw prompt with common prefix
          writePrompt();
          if (common.length > partial.length) {
            inputBufferRef.current = prefix + common;
          } else {
            inputBufferRef.current = prefix + partial;
          }
          onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
          term.write(inputBufferRef.current);
        }
      } catch {
        // Silently ignore completion errors
        lastTabCompletions = [];
        lastTabIndex = -1;
      }
    };

    // Handle user input
    term.onData((data: string) => {
      if (!term) return;

      if (data === '\t') {
        handleTabCompletion();
      } else if (data === '\r') {
        lastTabCompletions = [];
        lastTabIndex = -1;
        executeCommand(inputBufferRef.current);
      } else if (data === '\x7f') {
        lastTabCompletions = [];
        lastTabIndex = -1;
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
          term.write('\b \b');
        }
      } else if (data === '\x03') {
        lastTabCompletions = [];
        lastTabIndex = -1;
        term.write('^C\r\n');
        writePrompt();
      } else if (data === '\x15') {
        lastTabCompletions = [];
        lastTabIndex = -1;
        const len = inputBufferRef.current.length;
        if (len > 0) {
          term.write('\x1b[2K\r');
          writePrompt();
        }
      } else if (data >= ' ') {
        lastTabCompletions = [];
        lastTabIndex = -1;
        inputBufferRef.current += data;
        onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
        term.write(data);
      }
    });

    // Resize observer — debounce fit to avoid flickering during drag resize
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || containerRef.current.offsetParent === null) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!containerRef.current || containerRef.current.offsetParent === null) return;
        try {
          fitAddon.fit();
        } catch {
          // Ignore fit errors
        }
      }, 80);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Theme observer
    const themeObserver = new MutationObserver(() => {
      term.options.theme = buildThemeFromCSS();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      xtermEl?.removeEventListener('keydown', handleKeydown, true);
      xtermEl?.removeEventListener('contextmenu', handleContextMenu);
      term.dispose();
      initializedTerminals.delete(instance.id);
      // CSS is shared globally, don't remove it
    };
  }, [instance.id, instance.shellType, onUpdateRefs]);

  // Handle fit when terminal becomes active
  useEffect(() => {
    if (isActive && instance.fitAddonRef) {
      setTimeout(() => {
        // Guard: skip if container is hidden (display:none on self or ancestor)
        if (!containerRef.current || containerRef.current.offsetParent === null) return;
        try {
          instance.fitAddonRef?.fit();
        } catch {
          // Ignore fit errors
        }
      }, 50);
    }
  }, [isActive, instance.fitAddonRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        padding: '12px 4px 12px 12px',
        overflow: 'hidden',
        visibility: isActive ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      {/* xterm.js will render here */}
    </div>
  );
};
