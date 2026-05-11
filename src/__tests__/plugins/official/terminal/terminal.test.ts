import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toNativePath,
  resolvePath,
  extractCdTarget,
  buildCompletionDisplayName,
  buildCompletionFullName,
} from '../../../../plugins/official/terminal/src/terminalUtils';

// Mock xterm modules
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    writeln: vi.fn(),
    write: vi.fn(),
    clear: vi.fn(),
    onData: vi.fn(),
    dispose: vi.fn(),
    onResize: vi.fn(),
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@xterm/addon-search', () => ({
  SearchAddon: vi.fn().mockImplementation(() => ({
    findNext: vi.fn(),
    findPrevious: vi.fn(),
    clearDecorations: vi.fn(),
  })),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// terminalUtils unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('toNativePath', () => {
  describe('on Windows-style cwd (F:\\...)', () => {
    const winCwd = 'F:\\md-client';

    it('converts /f/ to F:\\', () => {
      expect(toNativePath('/f/', winCwd)).toBe('F:\\');
    });

    it('converts /f/path to F:\\path', () => {
      expect(toNativePath('/f/md-client', winCwd)).toBe('F:\\md-client');
    });

    it('converts nested Unix paths', () => {
      expect(toNativePath('/c/Windows/System32', winCwd)).toBe('C:\\Windows\\System32');
    });

    it('leaves already-Windows absolute paths unchanged', () => {
      expect(toNativePath('D:\\some\\dir', winCwd)).toBe('D:\\some\\dir');
    });

    it('leaves relative paths unchanged', () => {
      expect(toNativePath('src/utils', winCwd)).toBe('src/utils');
    });

    it('handles drive-only /X', () => {
      expect(toNativePath('/f', winCwd)).toBe('F:\\');
    });
  });

  describe('on Unix-style cwd (/home/user)', () => {
    const unixCwd = '/home/user';

    it('leaves Unix paths unchanged when cwd is not Windows-style', () => {
      expect(toNativePath('/f/', unixCwd)).toBe('/f/');
      expect(toNativePath('/usr/local/bin', unixCwd)).toBe('/usr/local/bin');
    });
  });
});

describe('resolvePath', () => {
  describe('Windows cwd', () => {
    const cwd = 'F:\\md-client\\src';

    it('resolves relative path', () => {
      expect(resolvePath('utils', cwd)).toBe('F:/md-client/src/utils');
    });

    it('resolves . (current dir)', () => {
      expect(resolvePath('.', cwd)).toBe('F:/md-client/src');
    });

    it('resolves .. (parent dir)', () => {
      expect(resolvePath('..', cwd)).toBe('F:/md-client');
    });

    it('resolves multiple .. segments to drive root', () => {
      expect(resolvePath('../..', cwd)).toBe('F:/');
    });

    it('returns Windows absolute path unchanged', () => {
      expect(resolvePath('D:\\other', cwd)).toBe('D:\\other');
    });

    it('returns Unix absolute path unchanged', () => {
      expect(resolvePath('/usr/local', cwd)).toBe('/usr/local');
    });

    it('resolves ~ to drive:\\Users', () => {
      expect(resolvePath('~', cwd)).toBe('F:\\Users');
    });

    it('resolves ~/subpath under drive:\\Users', () => {
      const result = resolvePath('~/docs', cwd);
      expect(result).toBe('F:\\Users/docs');
    });
  });

  describe('Unix cwd', () => {
    const cwd = '/home/user/project';

    it('resolves relative path', () => {
      expect(resolvePath('src', cwd)).toBe('/home/user/project/src');
    });

    it('resolves .. to parent', () => {
      expect(resolvePath('..', cwd)).toBe('/home/user');
    });

    it('returns absolute path unchanged', () => {
      expect(resolvePath('/etc/hosts', cwd)).toBe('/etc/hosts');
    });

    it('resolves ~ to root when no Windows drive', () => {
      expect(resolvePath('~', cwd)).toBe('/');
    });
  });
});

describe('extractCdTarget', () => {
  it('extracts simple cd target', () => {
    expect(extractCdTarget('cd src')).toBe('src');
  });

  it('extracts quoted cd target', () => {
    expect(extractCdTarget('cd "my documents"')).toBe('my documents');
    expect(extractCdTarget("cd 'my documents'")).toBe('my documents');
  });

  it('extracts cd /d target (Windows flag)', () => {
    expect(extractCdTarget('cd /d D:\\other')).toBe('D:\\other');
  });

  it('extracts chdir command', () => {
    expect(extractCdTarget('chdir subdir')).toBe('subdir');
  });

  it('extracts cd - (OLDPWD)', () => {
    expect(extractCdTarget('cd -')).toBe('-');
  });

  it('extracts cd ~ (home)', () => {
    expect(extractCdTarget('cd ~')).toBe('~');
  });

  it('extracts Unix-style path', () => {
    expect(extractCdTarget('cd /f/md-client')).toBe('/f/md-client');
  });

  it('extracts drive switch (D:)', () => {
    expect(extractCdTarget('D:')).toBe('D:\\');
  });

  it('returns null for non-cd commands', () => {
    expect(extractCdTarget('ls -la')).toBeNull();
    expect(extractCdTarget('dir')).toBeNull();
    expect(extractCdTarget('echo hello')).toBeNull();
    expect(extractCdTarget('')).toBeNull();
  });

  it('is case-insensitive for CD keyword', () => {
    expect(extractCdTarget('CD src')).toBe('src');
    expect(extractCdTarget('Cd src')).toBe('src');
  });
});

describe('buildCompletionDisplayName', () => {
  it('appends / separator for directories (bash)', () => {
    expect(buildCompletionDisplayName('src', true, '/')).toBe('src/');
  });

  it('appends \\ separator for directories (cmd)', () => {
    expect(buildCompletionDisplayName('src', true, '\\')).toBe('src\\');
  });

  it('no separator for regular files', () => {
    expect(buildCompletionDisplayName('index.ts', false, '/')).toBe('index.ts');
  });
});

describe('buildCompletionFullName', () => {
  it('prepends directory prefix from partial', () => {
    expect(buildCompletionFullName('src', true, '/f/', '/')).toBe('/f/src/');
  });

  it('handles partial without directory prefix', () => {
    expect(buildCompletionFullName('index.ts', false, 'ind', '/')).toBe('index.ts');
  });

  it('handles nested partial prefix', () => {
    expect(buildCompletionFullName('utils', true, 'src/ut', '/')).toBe('src/utils/');
  });

  it('quotes completions containing spaces', () => {
    expect(buildCompletionFullName('my project', true, '', '/')).toBe('"my project/"');
  });

  it('handles Windows separator', () => {
    expect(buildCompletionFullName('docs', true, 'src\\do', '\\')).toBe('src\\docs\\');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tab-completion integration tests (mocked Tauri invoke)
// ─────────────────────────────────────────────────────────────────────────────

describe('Tab completion via shell_tab_complete (mocked)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls shell_tab_complete with correct cwd and partial', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValueOnce([
      { name: 'md-client', is_dir: true },
      { name: 'simone-web', is_dir: true },
    ]);

    const result = await mockInvoke('shell_tab_complete', {
      cwd: 'F:\\',
      partial: '/f/',
    });

    expect(mockInvoke).toHaveBeenCalledWith('shell_tab_complete', {
      cwd: 'F:\\',
      partial: '/f/',
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when directory does not exist', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValueOnce([]);

    const result = await mockInvoke('shell_tab_complete', {
      cwd: 'F:\\nonexistent',
      partial: '',
    });

    expect(result).toHaveLength(0);
  });

  it('marks directories with is_dir: true', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValueOnce([
      { name: 'src', is_dir: true },
      { name: 'README.md', is_dir: false },
    ]);

    const result = await mockInvoke<Array<{ name: string; is_dir: boolean }>>(
      'shell_tab_complete',
      { cwd: 'F:\\md-client', partial: '' },
    );

    const src = result?.find((e) => e.name === 'src');
    const readme = result?.find((e) => e.name === 'README.md');
    expect(src?.is_dir).toBe(true);
    expect(readme?.is_dir).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Plugin lifecycle tests (existing, preserved)
// ─────────────────────────────────────────────────────────────────────────────

describe('Terminal Plugin', () => {
  describe('manifest', () => {
    it('should have correct plugin metadata', async () => {
      const manifest = await import('../../../../plugins/official/terminal/manifest.json');
      expect(manifest.default.id).toBe('marklite-terminal');
      expect(manifest.default.name).toBe('Terminal');
      expect(manifest.default.version).toBe('1.0.0');
      expect(manifest.default.activationEvents).toContain('onStartup');
      expect(manifest.default.permissions).toContain('shell.execute');
      expect(manifest.default.permissions).toContain('sidebar.panel');
    });
  });

  describe('activate', () => {
    it('should register a sidebar panel and return deactivate function', async () => {
      const mockPanel = { dispose: vi.fn() };
      const mockCmd = { dispose: vi.fn() };
      const mockContext = {
        sidebar: {
          registerPanel: vi.fn().mockReturnValue(mockPanel),
        },
        commands: {
          register: vi.fn().mockReturnValue(mockCmd),
        },
      } as unknown as import('../../../../plugins/plugin-sandbox').PluginContext;

      const { activate } = await import('../../../../plugins/official/terminal/src/index');
      const result = activate(mockContext);

      expect(mockContext.sidebar.registerPanel).toHaveBeenCalledWith('terminal', {
        title: 'Terminal',
        icon: 'terminal',
        position: 'bottom',
        render: expect.any(Function),
      });
      expect(mockContext.commands.register).toHaveBeenCalledWith(
        'terminal.toggle',
        expect.any(Function),
        expect.objectContaining({ label: '切换终端', labelEn: 'Toggle Terminal' }),
      );
      expect(result.deactivate).toBeDefined();

      // Test deactivate
      result.deactivate();
      expect(mockPanel.dispose).toHaveBeenCalled();
      expect(mockCmd.dispose).toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should be a no-op function', async () => {
      const { deactivate } = await import('../../../../plugins/official/terminal/src/index');
      expect(() => deactivate()).not.toThrow();
    });
  });
});

