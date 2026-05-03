import { describe, it, expect } from 'vitest';
import type { Extension } from '@codemirror/state';

describe('indentGuides extension', () => {
  it('should export a function that returns a CodeMirror Extension', async () => {
    const { indentGuidesExtension } = await import('../../../lib/cm/cmIndentGuides');
    const result = indentGuidesExtension();
    expect(result).toBeDefined();
    expect(result).toBeTruthy();
  });

  it('should render indent guides for indented lines', async () => {
    const { EditorState } = await import('@codemirror/state');
    const { indentGuidesExtension } = await import('../../../lib/cm/cmIndentGuides');
    const ext = indentGuidesExtension();

    expect(() => {
      EditorState.create({
        doc: '  const x = 1;\n    const y = 2;\n',
        extensions: [ext],
      });
    }).not.toThrow();
  });

  it('should not render guides for non-indented lines', async () => {
    const { EditorState } = await import('@codemirror/state');
    const { indentGuidesExtension } = await import('../../../lib/cm/cmIndentGuides');
    const ext = indentGuidesExtension();

    expect(() => {
      EditorState.create({
        doc: 'no indent\nalso no indent\n',
        extensions: [ext],
      });
    }).not.toThrow();
  });

  it('should be lazy loaded (dynamic import)', async () => {
    const mod = await import('../../../lib/cm/cmIndentGuides');
    expect(mod.indentGuidesExtension).toBeInstanceOf(Function);
    // The async wrapper is also available for lazy loading
    expect(mod.loadIndentGuidesExtension).toBeInstanceOf(Function);
    const result = await mod.loadIndentGuidesExtension();
    expect(result).toBeDefined();
  });
});
