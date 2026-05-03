import { describe, it, expect, vi } from 'vitest';
import { createPluginContext, getRegisteredSections, type PluginContextDeps } from '../../plugins/plugin-context-factory';
import { createSandbox } from '../../plugins/plugin-sandbox';
import type { PluginPermission } from '../../plugins/permissions';

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

describe('settings.registerSection', () => {
  it('should register a section successfully', () => {
    const ctx = createPluginContext(makeDeps(), 'test-plugin');
    const render = () => document.createElement('div');
    const disposable = ctx.settings.registerSection({
      id: 'test-section',
      title: 'Test Section',
      render,
    });

    const sections = getRegisteredSections();
    expect(sections.get('test-plugin:test-section')).toBeDefined();
    expect(sections.get('test-plugin:test-section')!.title).toBe('Test Section');
    disposable.dispose();
  });

  it('should return Disposable that unregisters on dispose', () => {
    const ctx = createPluginContext(makeDeps(), 'test-plugin');
    const render = () => document.createElement('div');
    const disposable = ctx.settings.registerSection({
      id: 'dispose-section',
      title: 'Dispose Test',
      render,
    });

    const key = 'test-plugin:dispose-section';
    expect(getRegisteredSections().get(key)).toBeDefined();

    disposable.dispose();
    expect(getRegisteredSections().get(key)).toBeUndefined();
  });

  it('should throw PluginPermissionError when no settings.section permission', () => {
    const ctx = createPluginContext(makeDeps(), 'test-plugin');
    const hasPermission = (p: PluginPermission) => false;

    const sandboxed = createSandbox(ctx, hasPermission);
    expect(() =>
      sandboxed.settings.registerSection({ id: 'x', title: 'X', render: () => null }),
    ).toThrow();
  });

  it('should allow querying registered sections', () => {
    const ctx = createPluginContext(makeDeps(), 'plugin-a');
    const renderA = () => 'a';
    const renderB = () => 'b';

    const d1 = ctx.settings.registerSection({ id: 'sec1', title: 'Section 1', render: renderA });
    const d2 = ctx.settings.registerSection({ id: 'sec2', title: 'Section 2', render: renderB });

    const sections = getRegisteredSections();
    expect(sections.size).toBe(2);
    expect(sections.get('plugin-a:sec1')!.title).toBe('Section 1');
    expect(sections.get('plugin-a:sec2')!.title).toBe('Section 2');

    d1.dispose();
    expect(sections.size).toBe(1);
    expect(sections.has('plugin-a:sec1')).toBe(false);

    d2.dispose();
  });
});
