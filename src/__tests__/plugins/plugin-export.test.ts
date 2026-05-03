import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPluginContext, getRegisteredExporters, type PluginContextDeps } from '../../plugins/plugin-context-factory';
import { createSandbox } from '../../plugins/plugin-sandbox';
import { PluginPermissionError } from '../../plugins/permission-checker';

function makeDeps(overrides?: Partial<PluginContextDeps>): PluginContextDeps {
  return {
    getActiveTab: () => ({ path: '/test.md', content: 'hello' }),
    openFileInTab: () => {},
    getOpenFilePaths: () => ['/test.md'],
    registerSidebarPanel: () => {},
    unregisterSidebarPanel: () => {},
    addStatusBarItem: () => {},
    removeStatusBarItem: () => {},
    registerPreviewRenderer: () => {},
    unregisterPreviewRenderer: () => {},
    cmViewRef: { current: null },
    ...overrides,
  };
}

describe('export.registerExporter', () => {
  beforeEach(() => {
    // Clear module-level registered exporters
    getRegisteredExporters().clear();
  });

  it('should register an exporter successfully', () => {
    const ctx = createPluginContext(makeDeps(), 'test-plugin');
    const exporter = vi.fn();
    const disposable = ctx.export.registerExporter('pdf', exporter);
    expect(getRegisteredExporters().get('pdf')).toBe(exporter);
    disposable.dispose();
  });

  it('should overwrite previous exporter for same format', () => {
    const ctx = createPluginContext(makeDeps(), 'test-plugin');
    const exporter1 = vi.fn();
    const exporter2 = vi.fn();

    ctx.export.registerExporter('pdf', exporter1);
    ctx.export.registerExporter('pdf', exporter2);

    expect(getRegisteredExporters().get('pdf')).toBe(exporter2);
    expect(getRegisteredExporters().get('pdf')).not.toBe(exporter1);
  });

  it('should return Disposable that unregisters on dispose', () => {
    const ctx = createPluginContext(makeDeps(), 'test-plugin');
    const exporter = vi.fn();

    const disposable = ctx.export.registerExporter('html', exporter);
    expect(getRegisteredExporters().has('html')).toBe(true);

    disposable.dispose();
    expect(getRegisteredExporters().has('html')).toBe(false);
  });

  it('should throw PluginPermissionError when no export permission', () => {
    const ctx = createPluginContext(makeDeps(), 'test-plugin');
    const sandbox = createSandbox(ctx, () => false);

    expect(() => sandbox.export.registerExporter('pdf', vi.fn())).toThrow(PluginPermissionError);
    expect(getRegisteredExporters().has('pdf')).toBe(false);
  });
});
