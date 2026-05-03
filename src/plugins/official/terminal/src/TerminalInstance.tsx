import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import xtermCss from 'xterm/css/xterm.css?raw';
import type { TerminalInstance as TerminalInstanceType } from './types';

interface TerminalInstanceProps {
  instance: TerminalInstanceType;
  isActive: boolean;
  onUpdateRefs: (id: string, updates: Partial<Pick<TerminalInstanceType, 'termRef' | 'fitAddonRef' | 'inputBuffer' | 'cwd'>>) => void;
}

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
 * Component for a single xterm.js terminal instance.
 * Handles initialization, event handling, fit, and cleanup.
 */
export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ instance, isActive, onUpdateRefs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const inputBufferRef = useRef<string>(instance.inputBuffer);
  const cwdRef = useRef<string>(instance.cwd);

  // Update cwdRef when instance.cwd changes
  useEffect(() => {
    cwdRef.current = instance.cwd;
  }, [instance.cwd]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || instance.termRef) return;

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

    // Inject xterm CSS (only once per document)
    if (!document.querySelector('[data-xterm-css="marklite-terminal"]')) {
      const style = document.createElement('style');
      style.setAttribute('data-xterm-css', 'marklite-terminal');
      style.textContent = xtermCss;
      document.head.appendChild(style);
      styleRef.current = style;
    }

    term.open(containerRef.current);

    setTimeout(() => {
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
      let displayPath = '~';
      
      if (cwd) {
        // Convert Windows path to Unix-style for display
        let normalizedPath = cwd.replace(/\\/g, '/');
        
        // Convert Windows drive letters (C:/ -> /c/)
        normalizedPath = normalizedPath.replace(/^([A-Z]):/i, (_, drive) => `/${drive.toLowerCase()}`);
        
        // Show abbreviated path if too long (show last 3 segments)
        const segments = normalizedPath.split('/').filter(Boolean);
        if (segments.length > 3) {
          displayPath = '.../' + segments.slice(-3).join('/');
        } else {
          displayPath = normalizedPath || '/';
        }
      }
      
      writeOutput(`\x1b[36m${displayPath}\x1b[0m $ `);
      writeOutput(`${displayPath} $ `);
      inputBufferRef.current = '';
      onUpdateRefs(instance.id, { inputBuffer: '' });
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

      if (trimmed.length > 1000) {
        writeOutput('\x1b[31mError: Command too long (max 1000 characters)\x1b[0m\r\n');
        writePrompt();
        return;
      }

      const dangerousPatterns = ['rm -rf', 'del /f', 'format ', 'shutdown', 'reboot'];
      const lowerCmd = trimmed.toLowerCase();
      if (dangerousPatterns.some(pattern => lowerCmd.includes(pattern))) {
        writeOutput('\x1b[33mWarning: Potentially dangerous command detected.\x1b[0m\r\n');
        writeOutput('\x1b[33mCommand has been blocked. Only whitelisted commands are allowed.\x1b[0m\r\n');
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

    // Welcome message
    term.writeln('  \x1b[36mMarkLite Terminal\x1b[0m');
    term.writeln('  Commands are restricted to a whitelist for security.');
    term.writeln('  Type commands below. Use "clear" to clear, "exit" to close.');
    term.writeln('');
    writePrompt();

    // Handle user input
    term.onData((data: string) => {
      if (!term) return;

      if (data === '\r') {
        executeCommand(inputBufferRef.current);
      } else if (data === '\x7f') {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
          term.write('\b \b');
        }
      } else if (data === '\x03') {
        term.write('^C\r\n');
        writePrompt();
      } else if (data === '\x15') {
        const len = inputBufferRef.current.length;
        if (len > 0) {
          term.write('\x1b[2K\r');
          writePrompt();
        }
      } else if (data >= ' ') {
        inputBufferRef.current += data;
        onUpdateRefs(instance.id, { inputBuffer: inputBufferRef.current });
        term.write(data);
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors
      }
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
      themeObserver.disconnect();
      resizeObserver.disconnect();
      term.dispose();
      if (styleRef.current && styleRef.current.parentNode) {
        styleRef.current.remove();
      }
    };
  }, [instance.id, instance.termRef, instance.shellType, onUpdateRefs]);

  // Handle fit when terminal becomes active
  useEffect(() => {
    if (isActive && instance.fitAddonRef) {
      setTimeout(() => {
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
        width: '100%',
        height: '100%',
        padding: '4px',
        overflow: 'hidden',
        display: isActive ? 'block' : 'none',
      }}
    />
  );
};
