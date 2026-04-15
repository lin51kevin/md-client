/**
 * preview-edit plugin — stub tests
 *
 * The plugin is deprecated: Milkdown now provides native WYSIWYG editing.
 * The index.ts is a no-op stub. These tests verify the stub contract so the
 * plugin registry does not break.
 */
import { activate } from '../../plugins/official/preview-edit/src/index';
import type { PluginContext } from '../../plugins/plugin-sandbox';

function createMinimalCtx(): PluginContext {
  return {
    editor: {
      getContent: () => '',
      getSelection: () => null,
      getCursorPosition: () => ({ line: 1, column: 1, offset: 0 }),
      insertText: () => {},
      replaceRange: () => {},
      getActiveFilePath: () => null,
    },
    preview: { registerRenderer: () => ({ dispose: () => {} }) },
    commands: { register: () => ({ dispose: () => {} }) },
    sidebar: { registerPanel: () => ({ dispose: () => {} }) },
    statusbar: { addItem: () => ({ dispose: () => {} }) },
    workspace: {
      getActiveFile: () => null,
      getAllFiles: () => [],
      openFile: () => {},
      onFileChanged: () => ({ dispose: () => {} }),
    },
    storage: { get: async () => null, set: async () => {}, delete: async () => {} },
    ui: { showMessage: () => {}, showModal: async () => {} },
    files: { readFile: async () => null, watch: () => ({ dispose: () => {} }) },
    contextMenu: { addItem: () => ({ dispose: () => {} }) },
    settings: { registerSection: () => ({ dispose: () => {} }) },
    theme: { register: () => ({ dispose: () => {} }) },
    export: { registerExporter: () => ({ dispose: () => {} }) },
  } as unknown as PluginContext;
}

describe('preview-edit plugin (deprecated stub)', () => {
  it('activates and returns a deactivate function', () => {
    const ctx = createMinimalCtx();
    const plugin = activate(ctx);
    expect(plugin).toHaveProperty('deactivate');
    expect(typeof plugin.deactivate).toBe('function');
  });

  it('deactivate does not throw', () => {
    const ctx = createMinimalCtx();
    const plugin = activate(ctx);
    expect(() => plugin.deactivate()).not.toThrow();
  });

  it('calling deactivate multiple times is safe', () => {
    const ctx = createMinimalCtx();
    const plugin = activate(ctx);
    expect(() => {
      plugin.deactivate();
      plugin.deactivate();
    }).not.toThrow();
  });
});
