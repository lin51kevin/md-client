import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { getSymbolBreadcrumbs } from '../../../lib/cm/cmSymbolBreadcrumb';
import type { BreadcrumbItem } from '../../../lib/cm/cmSymbolBreadcrumb';

function findBreadcrumbs(code: string, line: number, col: number, ext?: any): BreadcrumbItem[] {
  // Build state with the cursor at the desired position
  const baseState = EditorState.create({
    doc: code,
    extensions: [ext ?? javascript()],
  });
  const pos = baseState.doc.line(line).from + col;
  const state = baseState.update({ selection: { anchor: pos } }).state;
  // Force the Lezer parser to fully parse the document
  ensureSyntaxTree(state, state.doc.length, 5000);
  // Use a minimal mock view — getSymbolBreadcrumbs only reads view.state
  const result = getSymbolBreadcrumbs({ state } as EditorView, 'test.ts');
  return result!;
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
    const state = EditorState.create({ doc: code, extensions: [markdown()] });
    const result = getSymbolBreadcrumbs({ state } as EditorView, 'readme.md');
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
