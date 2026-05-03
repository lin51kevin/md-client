import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Terminal Plugin', () => {
  describe('manifest', () => {
    it('should have correct plugin metadata', async () => {
      const manifest = await import('../manifest.json');
      expect(manifest.default.id).toBe('marklite-terminal');
      expect(manifest.default.name).toBe('Terminal');
      expect(manifest.default.version).toBe('1.0.0');
      expect(manifest.default.activationEvents).toContain('onStartup');
      expect(manifest.default.permissions).toContain('tauri.raw');
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
      } as unknown as import('../../../plugin-sandbox').PluginContext;

      const { activate } = await import('./index');
      const result = activate(mockContext);

      expect(mockContext.sidebar.registerPanel).toHaveBeenCalledWith('terminal', {
        title: 'Terminal',
        icon: 'terminal',
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
      const { deactivate } = await import('./index');
      expect(() => deactivate()).not.toThrow();
    });
  });
});
