import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import xtermCss from 'xterm/css/xterm.css?raw';

interface TerminalPanelProps {
  context: import('../../../plugin-sandbox').PluginContext;
}

/** Read a CSS variable value from the document root. */
function getCSSVar(name: string, fallback: string): string {
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

/** Detect whether the current theme has a dark background. */
function isDarkTheme(): boolean {
  const bg = getCSSVar('--bg-primary', '#ffffff');
  // Parse hex → luminance; dark if luminance < 128
  const hex = bg.replace('#', '').slice(0, 6);
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return false;
}

// ANSI color palettes — readable on their respective background
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

/** Build an xterm theme from the app's CSS variables. */
function buildThemeFromCSS(): Record<string, string> {
  const dark = isDarkTheme();
  const ansi = dark ? DARK_ANSI : LIGHT_ANSI;
  return {
    background: getCSSVar('--bg-secondary', dark ? '#161b22' : '#f6f8fa'),
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
      termRef.current.scrollToBottom();
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

    // Inject xterm CSS into document (plugin CSS is not auto-loaded by the plugin system)
    const style = document.createElement('style');
    style.setAttribute('data-xterm-css', 'marklite-terminal');
    style.textContent = xtermCss;
    document.head.appendChild(style);

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
        term.write('^C\r\n');
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
      style.remove();
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
        minHeight: 0,
      }}
    >
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          padding: '4px',
          position: 'relative',
        }}
      />
    </div>
  );
};
