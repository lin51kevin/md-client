import { describe, it, expect, vi } from 'vitest';
import { createSandbox } from '../../plugins/plugin-sandbox';
import { PluginPermissionError } from '../../plugins/permission-checker';
import type { PluginContext } from '../../plugins/plugin-sandbox';

function createMockContext(): PluginContext {
  return {
    editor: { getContent: vi.fn(() => 'hello'), insertText: vi.fn() },
    sidebar: { registerPanel: vi.fn() },
    statusbar: { addItem: vi.fn() },
    contextMenu: { addItem: vi.fn() },
    files: { readFile: vi.fn(() => 'content'), watch: vi.fn() },
    workspace: { getAllFiles: vi.fn(() => []), openFile: vi.fn() },
    commands: { register: vi.fn() },
    storage: { get: vi.fn(() => 'val'), set: vi.fn() },
    ui: { showMessage: vi.fn(), showError: vi.fn() },
    preview: { registerRenderer: vi.fn() },
    settings: { registerSection: vi.fn() },
    theme: { register: vi.fn() },
    export: { registerExporter: vi.fn() },
  };
}

describe('plugin-sandbox', () => {
  it('allows authorized API calls', () => {
    const ctx = createMockContext();
    const sandbox = createSandbox(ctx, () => true);
    expect(sandbox.editor.getContent()).toBe('hello');
    expect(ctx.editor.getContent).toHaveBeenCalled();
  });

  it('blocks unauthorized API calls', () => {
    const ctx = createMockContext();
    const sandbox = createSandbox(ctx, () => false);
    expect(() => sandbox.editor.getContent()).toThrow(PluginPermissionError);
    expect(ctx.editor.getContent).not.toHaveBeenCalled();
  });

  it('enforces per-method permission mapping', () => {
    const ctx = createMockContext();
    // Only grant editor.read
    const sandbox = createSandbox(ctx, (p) => p === 'editor.read');

    // editor.read OK
    expect(sandbox.editor.getContent()).toBe('hello');

    // editor.write blocked
    expect(() => sandbox.editor.insertText('x')).toThrow(PluginPermissionError);
  });

  it('wildcard namespaces: storage.* requires storage', () => {
    const ctx = createMockContext();
    const sandbox = createSandbox(ctx, (p) => p === 'storage');
    expect(sandbox.storage.get('key')).toBe('val');
  });

  it('wildcard namespaces: ui.* requires ui.message', () => {
    const ctx = createMockContext();
    const sandbox = createSandbox(ctx, (p) => p === 'ui.message');
    sandbox.ui.showMessage('hi');
    expect(ctx.ui.showMessage).toHaveBeenCalledWith('hi');
  });

  it('workspace methods require workspace permission', () => {
    const ctx = createMockContext();
    const sandbox = createSandbox(ctx, (p) => p === 'workspace');
    sandbox.workspace.getAllFiles();
    sandbox.workspace.openFile('test.md');
    expect(ctx.workspace.getAllFiles).toHaveBeenCalled();
    expect(ctx.workspace.openFile).toHaveBeenCalledWith('test.md');
  });

  it('returns undefined for non-existent namespace', () => {
    const ctx = createMockContext();
    const sandbox = createSandbox(ctx, () => true);
    expect((sandbox as any).nonexistent).toBeUndefined();
  });

  it('returns non-function properties as-is', () => {
    const ctx = { ...createMockContext(), editor: { ...createMockContext().editor, prop: 42 } } as PluginContext;
    const sandbox = createSandbox(ctx, () => true);
    expect((sandbox.editor as any).prop).toBe(42);
  });
});
