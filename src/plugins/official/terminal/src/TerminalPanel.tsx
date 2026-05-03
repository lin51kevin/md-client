import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalPanelProps {
  context: import('../../../plugin-sandbox').PluginContext;
}

/** Read a CSS variable value from the document root. */
function getCSSVar(name: string, fallback: string): string {
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

/** Build an xterm theme from the app's CSS variables. */
function buildThemeFromCSS(): Record<string, string> {
  return {
    background: getCSSVar('--bg-secondary', '#1e1e2e'),
    foreground: getCSSVar('--text-primary', '#cdd6f4'),
    cursor: getCSSVar('--accent-color', '#f5e0dc'),
    selectionBackground: getCSSVar('--selection-bg', '#585b7066'),
    green: getCSSVar('--terminal-green', '#a6e3a1'),
    red: getCSSVar('--terminal-red', '#f38ba8'),
    yellow: getCSSVar('--terminal-yellow', '#f9e2af'),
    blue: getCSSVar('--terminal-blue', '#89b4fa'),
    magenta: getCSSVar('--terminal-magenta', '#f5c2e7'),
    cyan: getCSSVar('--terminal-cyan', '#94e2d5'),
  };
}

/**
 * Terminal panel component using xterm.js.
 * Commands are executed via Tauri's shell plugin.
 */
export const TerminalPanel: React.FC<TerminalPanelProps> = ({ context: _context }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef<string>('');
  const cwdRef = useRef<string>('');

  const writeOutput = useCallback((text: string) => {
    if (termRef.current) {
      termRef.current.write(text);
    }
  }, []);

  const executeCommand = useCallback(async (command: string) => {
    const term = termRef.current;
    if (!term) return;

    writeOutput(`\r\n`);

    // Handle built-in commands
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
      return;
    }

    try {
      // Use Tauri invoke to execute shell command
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<string>('execute_shell_command', {
        command: trimmed,
        cwd: cwdRef.current || undefined,
      });
      if (result) {
        writeOutput(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      writeOutput(`\x1b[31mError: ${message}\x1b[0m`);
    }

    writePrompt();
  }, [writeOutput]);

  const writePrompt = useCallback(() => {
    const cwd = cwdRef.current;
    const displayPath = cwd ? cwd.replace(/^C:\\/, '/c/').replace(/\\/g, '/') : '~';
    writeOutput(`${displayPath} $ `);
    inputBufferRef.current = '';
  }, [writeOutput]);

  useEffect(() => {
    if (!containerRef.current) return;

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
    term.open(containerRef.current);

    // Initial fit
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {
        // Container may not be ready
      }
    }, 100);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('  Type commands below. Use "clear" to clear, "exit" to close.');
    term.writeln('');
    writePrompt();

    // Handle user input
    term.onData((data: string) => {
      if (!term) return;

      if (data === '\r') {
        // Enter - execute command
        executeCommand(inputBufferRef.current);
      } else if (data === '\x7f') {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        term.write('^C');
        writePrompt();
      } else if (data === '\x15') {
        // Ctrl+U - clear line
        const len = inputBufferRef.current.length;
        if (len > 0) {
          term.write('\x1b[2K\r');
          writePrompt();
        }
      } else if (data >= ' ') {
        // Printable characters
        inputBufferRef.current += data;
        term.write(data);
      }
      // Ignore other control characters
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors
      }
    });
    resizeObserver.observe(containerRef.current);

    // Theme observer — update xterm colors when the app theme changes
    const themeObserver = new MutationObserver(() => {
      term.options.theme = buildThemeFromCSS();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary, #1e1e2e)',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '4px',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};
