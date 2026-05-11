import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import xtermCss from 'xterm/css/xterm.css?raw';
import type { TerminalInstance as TerminalInstanceType } from './types';

interface TerminalInstanceProps {
  instance: TerminalInstanceType;
  isActive: boolean;
  onUpdateRefs: (id: string, updates: Partial<Pick<TerminalInstanceType, 'termRef' | 'fitAddonRef'>>) => void;
  onPtyExited?: (id: string) => void;
}

/** Track which terminal IDs have been initialized to prevent double-init. */
const initializedTerminals = new Set<string>();

/** Default font size for terminals. */
const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 28;

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
 * Terminal instance backed by a real PTY process.
 *
 * All input/output flows through the PTY:
 *   xterm.js onData → pty_write → shell stdin
 *   shell stdout → pty-data event → xterm.js write
 *
 * The shell itself handles prompts, history, tab-completion, cursor movement,
 * Ctrl+C/Z/D, pipes, redirects, interactive programs, etc.
 */
export const TerminalInstance: React.FC<TerminalInstanceProps> = ({
  instance,
  isActive,
  onUpdateRefs,
  onPtyExited,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<number>(DEFAULT_FONT_SIZE);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keep callback refs fresh so the useEffect closure never goes stale
  const onUpdateRefsRef = useRef(onUpdateRefs);
  onUpdateRefsRef.current = onUpdateRefs;
  const onPtyExitedRef = useRef(onPtyExited);
  onPtyExitedRef.current = onPtyExited;

  // Track the current PTY session ID for resize calls from outside the main effect
  const ptySessionIdRef = useRef<string>('');

  // Stable callback for font-size zoom
  const applyFontSize = useCallback((term: Terminal, fitAddon: FitAddon, delta: number) => {
    const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSizeRef.current + delta));
    if (next === fontSizeRef.current) return;
    fontSizeRef.current = next;
    term.options.fontSize = next;
    try { fitAddon.fit(); } catch { /* ignore */ }
  }, []);

  // Initialize terminal + PTY
  useEffect(() => {
    if (!containerRef.current) return;
    if (initializedTerminals.has(instance.id)) return;
    initializedTerminals.add(instance.id);

    // Unique session ID per mount cycle — prevents React StrictMode
    // double-mount from having the cleanup's async pty_kill kill the
    // newly created session (both would share the same instance.id).
    const ptySessionId = `${instance.id}-${Date.now()}`;
    ptySessionIdRef.current = ptySessionId;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: DEFAULT_FONT_SIZE,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, Monaco, monospace',
      theme: buildThemeFromCSS(),
      allowTransparency: true,
      scrollback: 10000,
      convertEol: false, // PTY sends correct line endings
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    searchAddonRef.current = searchAddon;

    // Inject xterm CSS (only once per document, shared by all terminals)
    if (!document.querySelector('[data-xterm-css="marklite-terminal"]')) {
      const style = document.createElement('style');
      style.setAttribute('data-xterm-css', 'marklite-terminal');
      style.textContent = xtermCss;
      document.head.appendChild(style);
    }

    term.open(containerRef.current);

    // Initial fit after a short delay for DOM layout
    setTimeout(() => {
      if (!containerRef.current || containerRef.current.offsetParent === null) return;
      try { fitAddon.fit(); } catch { /* Container may not be ready */ }
    }, 100);

    // Update parent state with refs
    onUpdateRefsRef.current(instance.id, { termRef: term, fitAddonRef: fitAddon });

    // --- PTY lifecycle ---
    let ptyReady = false;
    let active = true; // Cancelled by cleanup to prevent StrictMode race
    let unlistenData: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    const setupPty = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        if (!active) return;
        const { listen } = await import('@tauri-apps/api/event');
        if (!active) return;

        // Listen for PTY output BEFORE spawning so we don't miss early data
        unlistenData = await listen<string>(`pty-data-${ptySessionId}`, (event) => {
          term.write(event.payload);
        });
        if (!active) { unlistenData(); unlistenData = null; return; }

        unlistenExit = await listen(`pty-exit-${ptySessionId}`, () => {
          term.write('\r\n\x1b[33m[Process exited]\x1b[0m\r\n');
          ptyReady = false;
          onPtyExitedRef.current?.(instance.id);
        });
        if (!active) { unlistenData(); unlistenData = null; unlistenExit(); unlistenExit = null; return; }

        // Spawn the PTY process
        await invoke('pty_spawn', {
          id: ptySessionId,
          shellType: instance.shellType,
          cwd: instance.cwd || undefined,
          rows: term.rows,
          cols: term.cols,
        });

        if (!active) {
          // Cleanup ran while spawn was in flight — kill the just-spawned PTY
          invoke('pty_kill', { id: ptySessionId }).catch(() => {});
          unlistenData?.(); unlistenData = null;
          unlistenExit?.(); unlistenExit = null;
          return;
        }

        ptyReady = true;
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : String(err);
        term.write(`\x1b[31mFailed to start terminal: ${message}\x1b[0m\r\n`);
      }
    };

    setupPty();

    // --- Input: forward all keystrokes to PTY ---
    term.onData(async (data: string) => {
      if (!ptyReady) return;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('pty_write', { id: ptySessionId, data });
      } catch {
        // PTY may have been killed
      }
    });

    // --- Keyboard shortcuts (Ctrl+C copy, Ctrl+V paste, Ctrl+Shift+F search, Ctrl+=/- zoom) ---
    const handleKeydown = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl+C: copy selection if exists, else forward to PTY (handled by onData)
      if (ctrlOrMeta && e.key === 'c') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          e.preventDefault();
          return;
        }
        // No selection → fall through to onData (\x03 → SIGINT)
      }

      // Ctrl+V: paste
      if (ctrlOrMeta && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then(async (text) => {
          if (!text || !ptyReady) return;
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('pty_write', { id: ptySessionId, data: text });
          } catch { /* ignore */ }
        }).catch(() => { /* clipboard read denied */ });
        return;
      }

      // Ctrl+Shift+F: toggle search bar
      if (ctrlOrMeta && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggleSearchBar();
        return;
      }

      // Ctrl+= / Ctrl+- / Ctrl+0: font size zoom
      if (ctrlOrMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        applyFontSize(term, fitAddon, 1);
        return;
      }
      if (ctrlOrMeta && e.key === '-') {
        e.preventDefault();
        applyFontSize(term, fitAddon, -1);
        return;
      }
      if (ctrlOrMeta && e.key === '0') {
        e.preventDefault();
        fontSizeRef.current = DEFAULT_FONT_SIZE;
        term.options.fontSize = DEFAULT_FONT_SIZE;
        try { fitAddon.fit(); } catch { /* ignore */ }
        return;
      }

      // Escape: close search bar
      if (e.key === 'Escape' && searchBarRef.current?.style.display !== 'none') {
        hideSearchBar();
      }
    };
    const xtermEl = containerRef.current?.querySelector('.xterm') as HTMLElement | null;
    xtermEl?.addEventListener('keydown', handleKeydown, true);

    // Right-click: copy selection or paste
    const handleContextMenu = (e: MouseEvent) => {
      const selection = term.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        term.clearSelection();
      } else {
        e.preventDefault();
        navigator.clipboard.readText().then(async (text) => {
          if (!text || !ptyReady) return;
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('pty_write', { id: ptySessionId, data: text });
          } catch { /* ignore */ }
        }).catch(() => { /* clipboard denied */ });
      }
    };
    xtermEl?.addEventListener('contextmenu', handleContextMenu);

    // --- Search bar helpers ---
    const toggleSearchBar = () => {
      if (!searchBarRef.current) return;
      const visible = searchBarRef.current.style.display !== 'none';
      if (visible) {
        hideSearchBar();
      } else {
        searchBarRef.current.style.display = 'flex';
        searchInputRef.current?.focus();
      }
    };

    const hideSearchBar = () => {
      if (searchBarRef.current) searchBarRef.current.style.display = 'none';
      searchAddonRef.current?.clearDecorations();
      term.focus();
    };

    // --- Resize observer → PTY resize ---
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || containerRef.current.offsetParent === null) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(async () => {
        if (!containerRef.current || containerRef.current.offsetParent === null) return;
        try {
          fitAddon.fit();
          // Notify PTY backend of new size
          if (ptyReady) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('pty_resize', {
              id: ptySessionId,
              rows: term.rows,
              cols: term.cols,
            });
          }
        } catch { /* ignore */ }
      }, 80);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Theme observer
    const themeObserver = new MutationObserver(() => {
      term.options.theme = buildThemeFromCSS();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });

    // Cleanup
    return () => {
      active = false; // Cancel any in-flight setupPty
      if (resizeTimer) clearTimeout(resizeTimer);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      xtermEl?.removeEventListener('keydown', handleKeydown, true);
      xtermEl?.removeEventListener('contextmenu', handleContextMenu);
      unlistenData?.();
      unlistenExit?.();

      // Kill the PTY process — uses ptySessionId so StrictMode re-mount
      // won't accidentally kill the new session (it gets a fresh ID).
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('pty_kill', { id: ptySessionId }).catch(() => {});
      });

      term.dispose();
      initializedTerminals.delete(instance.id);
    };
    // Only depend on instance.id — the PTY session is tied to the terminal ID.
    // shellType and cwd are captured at spawn time and don't change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id]);

  // Handle fit when terminal becomes active
  useEffect(() => {
    if (isActive && instance.fitAddonRef) {
      setTimeout(async () => {
        if (!containerRef.current || containerRef.current.offsetParent === null) return;
        try {
          instance.fitAddonRef?.fit();
          // Also sync PTY size when switching tabs
          if (instance.termRef && ptySessionIdRef.current) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('pty_resize', {
              id: ptySessionIdRef.current,
              rows: instance.termRef.rows,
              cols: instance.termRef.cols,
            }).catch(() => {});
          }
        } catch { /* ignore */ }
      }, 50);
    }
  }, [isActive, instance.fitAddonRef, instance.termRef, instance.id]);

  // Search bar event handlers
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    if (query) {
      searchAddonRef.current?.findNext(query);
    } else {
      searchAddonRef.current?.clearDecorations();
    }
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = (e.target as HTMLInputElement).value;
      if (e.shiftKey) {
        searchAddonRef.current?.findPrevious(query);
      } else {
        searchAddonRef.current?.findNext(query);
      }
    }
    if (e.key === 'Escape') {
      if (searchBarRef.current) searchBarRef.current.style.display = 'none';
      searchAddonRef.current?.clearDecorations();
      instance.termRef?.focus();
    }
  }, [instance.termRef]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        visibility: isActive ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      {/* Search bar (hidden by default) */}
      <div
        ref={searchBarRef}
        style={{
          display: 'none',
          position: 'absolute',
          top: 4,
          right: 16,
          zIndex: 20,
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 4,
          background: 'var(--bg-tertiary, #2d2d3d)',
          border: '1px solid var(--border-color, #444)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search…"
          onChange={handleSearchInput}
          onKeyDown={handleSearchKeyDown}
          style={{
            width: 180,
            padding: '2px 6px',
            fontSize: 12,
            border: '1px solid var(--border-color, #555)',
            borderRadius: 3,
            background: 'var(--bg-primary, #1e1e2e)',
            color: 'var(--text-primary, #cdd6f4)',
            outline: 'none',
          }}
        />
        <button
          onClick={() => {
            if (searchInputRef.current?.value) {
              searchAddonRef.current?.findPrevious(searchInputRef.current.value);
            }
          }}
          title="Previous (Shift+Enter)"
          style={searchBtnStyle}
        >
          ↑
        </button>
        <button
          onClick={() => {
            if (searchInputRef.current?.value) {
              searchAddonRef.current?.findNext(searchInputRef.current.value);
            }
          }}
          title="Next (Enter)"
          style={searchBtnStyle}
        >
          ↓
        </button>
        <button
          onClick={() => {
            if (searchBarRef.current) searchBarRef.current.style.display = 'none';
            searchAddonRef.current?.clearDecorations();
            instance.termRef?.focus();
          }}
          title="Close (Escape)"
          style={searchBtnStyle}
        >
          ✕
        </button>
      </div>

      {/* xterm.js container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          padding: '12px 4px 12px 12px',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};

const searchBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary, #999)',
  cursor: 'pointer',
  fontSize: 13,
  padding: '2px 4px',
  lineHeight: 1,
};
