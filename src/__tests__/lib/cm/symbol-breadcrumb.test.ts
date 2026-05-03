import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { getSymbolBreadcrumbs } from '../../../lib/cm/cmSymbolBreadcrumb';
import type { BreadcrumbItem } from '../../../lib/cm/cmSymbolBreadcrumb';

function createView(code: string, ext: any = javascript()) {
  const state = EditorState.create({
    doc: code,
    extensions: [ext, EditorView.dom],
  });
  return new EditorView({ state });
}

function findBreadcrumbs(code: string, line: number, col: number, ext?: any): BreadcrumbItem[] {
  const view = createView(code, ext);
  const pos = view.state.doc.line(line).from + col;
  const result = getSymbolBreadcrumbs(view, 'test.ts');
  view.destroy();
  return result;
}

describe('getSymbolBreadcrumbs', () => {
  it('should extract the function name at cursor', () => {
    const code = `function hello() {\n  const x = 1;\n}\n`;
    const result = findBreadcrumbs(code, 2, 2);
    expect(result).toBeDefined();
    const names = result.map(b => b.name);
    expect(names).toContain('hello');
  });

  it('should extract parent class > method chain', () => {
    const code = `class MyClass {\n  myMethod() {\n    return 1;\n  }\n}\n`;
    const result = findBreadcrumbs(code, 3, 4);
    expect(result).toBeDefined();
    const names = result.map(b => b.name);
    expect(names).toContain('MyClass');
    expect(names).toContain('myMethod');
    expect(names).toContain('test.ts');
    // Class should come before method
    const classIdx = names.indexOf('MyClass');
    const methodIdx = names.indexOf('myMethod');
    expect(classIdx).toBeLessThan(methodIdx);
  });

  it('should return null for markdown files', () => {
    const code = `# Title\n\nSome text\n`;
    const view = createView(code, markdown());
    const result = getSymbolBreadcrumbs(view, 'readme.md');
    view.destroy();
    expect(result).toBeNull();
  });

  it('should use filename as fallback when no symbols found', () => {
    const code = `const x = 1;\n`;
    const result = findBreadcrumbs(code, 1, 0);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[result.length - 1].name).toBe('test.ts');
    expect(result[result.length - 1].type).toBe('file');
  });

  it('should handle nested arrow functions', () => {
    const code = `function outer() {\n  const inner = () => {\n    return 1;\n  };\n}\n`;
    const result = findBreadcrumbs(code, 3, 4);
    expect(result).toBeDefined();
    const names = result.map(b => b.name);
    expect(names).toContain('outer');
  });
});
