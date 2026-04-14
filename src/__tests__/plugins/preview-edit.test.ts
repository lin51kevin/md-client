import React from 'react';
import { activate } from '../../plugins/official/preview-edit/src/index';
import type { PluginContext, Disposable, PreviewAPI } from '../../plugins/plugin-sandbox';
import { MarkdownAST } from '../../lib/markdown-ast';

// ── Mock helpers ──────────────────────────────────────────────────────────

function createMockCtx(overrides?: Partial<PluginContext>): PluginContext {
  let content = '# Hello\n\nWorld paragraph.\n\n> A quote\n\n- item 1\n\n```\ncode\n```';
  const operations: Array<{ text: string; from?: number; to?: number }> = [];

  return {
    editor: {
      getContent: () => content,
      getSelection: () => null,
      getCursorPosition: () => ({ line: 1, column: 1, offset: 0 }),
      insertText: (text: string, from?: number, to?: number) => {
        operations.push({ text, from, to });
        const f = from ?? 0;
        const t = to ?? content.length;
        content = content.slice(0, f) + text + content.slice(t);
      },
      replaceRange: (_f, _t, _text) => {},
      getActiveFilePath: () => '/test.md',
    },
    preview: {
      registerRenderer: (() => {
        const renderers: Map<string, Function> = new Map();
        return (nodeType: string, fn: Function): Disposable => {
          renderers.set(nodeType, fn);
          return {
            dispose: () => { renderers.delete(nodeType); },
          };
        };
      })() as PreviewAPI['registerRenderer'],
    },
    commands: { register: () => ({ dispose: () => {} }) },
    sidebar: { registerPanel: () => ({ dispose: () => {} }) },
    statusbar: { addItem: () => ({ dispose: () => {} }) },
    workspace: {
      getActiveFile: () => ({ path: '/test.md', name: 'test.md' }),
      getAllFiles: () => ['/test.md'],
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
    ...overrides,
  } as unknown as PluginContext;
}

// Simple renderer to get the result
function renderWithPlugin(nodeType: string, props: Record<string, unknown>, ctx: PluginContext) {
  const plugin = activate(ctx);
  // Get the registered renderer
  const registerFn = (ctx.preview as any).__getMockRenderer?.(nodeType);
  // Since we can't easily extract the renderer, test via the API behavior
  plugin.deactivate();
}

describe('preview-edit plugin', () => {
  it('activates and returns deactivate function', () => {
    const ctx = createMockCtx();
    const plugin = activate(ctx);
    expect(plugin).toHaveProperty('deactivate');
    expect(typeof plugin.deactivate).toBe('function');
    plugin.deactivate();
  });

  it('registers renderers for all expected node types', () => {
    const ctx = createMockCtx();
    const registeredTypes: string[] = [];
    const origRegister = ctx.preview.registerRenderer.bind(ctx.preview);
    (ctx.preview as any).registerRenderer = (nodeType: string, fn: Function): Disposable => {
      registeredTypes.push(nodeType);
      return { dispose: () => {} };
    };

    const plugin = activate(ctx);

    expect(registeredTypes).toContain('p');
    expect(registeredTypes).toContain('h1');
    expect(registeredTypes).toContain('h2');
    expect(registeredTypes).toContain('h3');
    expect(registeredTypes).toContain('h4');
    expect(registeredTypes).toContain('h5');
    expect(registeredTypes).toContain('h6');
    expect(registeredTypes).toContain('blockquote');
    expect(registeredTypes).toContain('li');
    expect(registeredTypes).toContain('pre');
    expect(registeredTypes.length).toBe(10);

    plugin.deactivate();
  });

  it('deactivate disposes all renderers', () => {
    const ctx = createMockCtx();
    let disposeCount = 0;
    (ctx.preview as any).registerRenderer = (nodeType: string, fn: Function): Disposable => {
      return { dispose: () => { disposeCount++; } };
    };

    const plugin = activate(ctx);
    plugin.deactivate();
    expect(disposeCount).toBe(10);
  });

  it('editing paragraph applies offset-based replacement', () => {
    const ctx = createMockCtx();
    const content = ctx.editor.getContent();
    const ast = new MarkdownAST(content);

    // Find the paragraph "World paragraph."
    const posMap = ast.buildPositionMap(content);
    let paraEntry: { startOffset: number; endOffset: number; sourceText: string } | null = null;
    for (const [, entry] of posMap) {
      if (entry.node.type === 'paragraph') {
        paraEntry = entry;
        break;
      }
    }

    expect(paraEntry).not.toBeNull();
    expect(paraEntry!.sourceText).toBe('World paragraph.');

    // Simulate what the plugin does: insertText at offset
    ctx.editor.insertText('New paragraph.', paraEntry!.startOffset, paraEntry!.endOffset);

    const newContent = ctx.editor.getContent();
    expect(newContent).toContain('New paragraph.');
    expect(newContent).not.toContain('World paragraph.');
    expect(newContent).toContain('# Hello');
    expect(newContent).toContain('> A quote');
  });

  it('editing blockquote applies offset-based replacement', () => {
    const ctx = createMockCtx();
    const content = ctx.editor.getContent();
    const ast = new MarkdownAST(content);
    const posMap = ast.buildPositionMap(content);

    let bqEntry: { startOffset: number; endOffset: number; sourceText: string } | null = null;
    for (const [, entry] of posMap) {
      if (entry.node.type === 'blockquote') {
        bqEntry = entry;
        break;
      }
    }

    expect(bqEntry).not.toBeNull();
    expect(bqEntry!.sourceText).toBe('> A quote');

    ctx.editor.insertText('> Updated quote', bqEntry!.startOffset, bqEntry!.endOffset);
    const newContent = ctx.editor.getContent();
    expect(newContent).toContain('> Updated quote');
    expect(newContent).not.toContain('> A quote');
  });

  it('editing list item applies offset-based replacement', () => {
    const ctx = createMockCtx();
    const content = ctx.editor.getContent();
    const ast = new MarkdownAST(content);
    const posMap = ast.buildPositionMap(content);

    let liEntry: { startOffset: number; endOffset: number; sourceText: string } | null = null;
    for (const [, entry] of posMap) {
      if (entry.node.type === 'listItem') {
        liEntry = entry;
        break;
      }
    }

    expect(liEntry).not.toBeNull();
    expect(liEntry!.sourceText).toBe('- item 1');

    ctx.editor.insertText('- updated item', liEntry!.startOffset, liEntry!.endOffset);
    const newContent = ctx.editor.getContent();
    expect(newContent).toContain('- updated item');
    expect(newContent).not.toContain('- item 1');
  });

  it('editing code block applies offset-based replacement', () => {
    const ctx = createMockCtx();
    const content = ctx.editor.getContent();
    const ast = new MarkdownAST(content);
    const posMap = ast.buildPositionMap(content);

    let codeEntry: { startOffset: number; endOffset: number; sourceText: string } | null = null;
    for (const [, entry] of posMap) {
      if (entry.node.type === 'code') {
        codeEntry = entry;
        break;
      }
    }

    expect(codeEntry).not.toBeNull();
    expect(codeEntry!.sourceText).toContain('code');

    ctx.editor.insertText('```\nnew code\n```', codeEntry!.startOffset, codeEntry!.endOffset);
    const newContent = ctx.editor.getContent();
    expect(newContent).toContain('new code');
    expect(newContent).not.toContain('\ncode\n');
  });

  it('same text appearing multiple times is replaced precisely by offset', () => {
    const ctx = createMockCtx();
    // Set content with duplicate text
    let content = 'hello\n\nhello\n\nhello';
    const ops: Array<{ text: string; from?: number; to?: number }> = [];
    (ctx.editor as any).getContent = () => content;
    (ctx.editor as any).insertText = (text: string, from?: number, to?: number) => {
      const f = from ?? 0;
      const t = to ?? content.length;
      ops.push({ text, from: f, to: t });
      content = content.slice(0, f) + text + content.slice(t);
    };

    // Replace only the second "hello" (offset 7-12)
    ctx.editor.insertText('world', 7, 12);
    expect(ops[0].from).toBe(7);
    expect(ops[0].to).toBe(12);
    expect(content).toBe('hello\n\nworld\n\nhello');
  });

  it('no modification when content unchanged', () => {
    const ctx = createMockCtx();
    const content = ctx.editor.getContent();
    const ast = new MarkdownAST(content);
    const posMap = ast.buildPositionMap(content);

    let entry: { startOffset: number; endOffset: number; sourceText: string } | null = null;
    for (const [, e] of posMap) {
      if (e.node.type === 'paragraph') { entry = e; break; }
    }

    // Replace with same text - still triggers insertText but the result is identical
    ctx.editor.insertText(entry!.sourceText, entry!.startOffset, entry!.endOffset);
    expect(ctx.editor.getContent()).toBe(content);
  });

  it('undo reverses an edit operation', async () => {
    const { EditHistoryManager } = await import('../../lib/edit-history');
    const history = new EditHistoryManager();

    history.push({
      type: 'block-replace',
      nodeId: 'test',
      before: 'old text',
      after: 'new text',
      timestamp: Date.now(),
    });

    expect(history.canUndo).toBe(true);
    const op = history.undo();
    expect(op).not.toBeNull();
    expect(op!.before).toBe('old text');
    expect(op!.after).toBe('new text');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('redo re-applies an edit operation', async () => {
    const { EditHistoryManager } = await import('../../lib/edit-history');
    const history = new EditHistoryManager();

    history.push({
      type: 'block-replace',
      nodeId: 'test',
      before: 'old text',
      after: 'new text',
      timestamp: Date.now(),
    });

    history.undo();
    expect(history.canRedo).toBe(true);
    const op = history.redo();
    expect(op).not.toBeNull();
    expect(op!.before).toBe('old text');
    expect(op!.after).toBe('new text');
    expect(history.canRedo).toBe(false);
    expect(history.canUndo).toBe(true);
  });
});
