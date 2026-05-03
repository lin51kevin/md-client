import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSandbox } from '../../plugins/plugin-sandbox';
import { createPluginContext } from '../../plugins/plugin-context-factory';
import { PluginPermissionError } from '../../plugins/permission-checker';

function createMinimalDeps() {
  return {
    getActiveTab: () => null,
    openFileInTab: vi.fn(),
    getOpenFilePaths: () => [],
    cmViewRef: { current: null } as any,
    registerSidebarPanel: vi.fn(),
    unregisterSidebarPanel: vi.fn(),
    addStatusBarItem: vi.fn(),
    removeStatusBarItem: vi.fn(),
    registerPreviewRenderer: vi.fn(),
    unregisterPreviewRenderer: vi.fn(),
  };
}

describe('theme.register', () => {
  it('should inject CSS variables into document', () => {
    const ctx = createPluginContext(createMinimalDeps(), 'test-plugin');
    const sandbox = createSandbox(ctx, (p) => p === 'theme');

    const disposable = sandbox.theme.register({ '--custom-color': '#ff0000' });

    const style = document.querySelector('style[data-plugin-theme]');
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('--custom-color: #ff0000');

    disposable.dispose();
  });

  it('should remove injected style tag on dispose', () => {
    const ctx = createPluginContext(createMinimalDeps(), 'test-plugin');
    const sandbox = createSandbox(ctx, (p) => p === 'theme');

    const disposable = sandbox.theme.register({ '--bg': '#fff' });
    expect(document.querySelector('style[data-plugin-theme]')).not.toBeNull();

    disposable.dispose();
    expect(document.querySelector('style[data-plugin-theme]')).toBeNull();
  });

  it('should allow multiple plugins to register independent themes', () => {
    const ctx1 = createPluginContext(createMinimalDeps(), 'plugin-a');
    const ctx2 = createPluginContext(createMinimalDeps(), 'plugin-b');
    const sandbox1 = createSandbox(ctx1, (p) => p === 'theme');
    const sandbox2 = createSandbox(ctx2, (p) => p === 'theme');

    const d1 = sandbox1.theme.register({ '--a': 'red' });
    const d2 = sandbox2.theme.register({ '--b': 'blue' });

    const styles = document.querySelectorAll('style[data-plugin-theme]');
    expect(styles.length).toBe(2);

    d1.dispose();
    expect(document.querySelectorAll('style[data-plugin-theme]').length).toBe(1);

    d2.dispose();
    expect(document.querySelectorAll('style[data-plugin-theme]').length).toBe(0);
  });

  it('should throw PluginPermissionError when no theme permission', () => {
    const ctx = createPluginContext(createMinimalDeps(), 'test-plugin');
    const sandbox = createSandbox(ctx, () => false);

    expect(() => sandbox.theme.register({ '--c': '#000' })).toThrow(PluginPermissionError);
    expect(document.querySelector('style[data-plugin-theme]')).toBeNull();
  });
});
