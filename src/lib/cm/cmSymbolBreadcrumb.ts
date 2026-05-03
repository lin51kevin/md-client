/**
 * Symbol-level breadcrumb for code files.
 * Extracts the symbol hierarchy (class > method > ...) at the cursor position.
 */
import type { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

export interface BreadcrumbItem {
  name: string;
  type: 'class' | 'function' | 'method' | 'variable' | 'file';
}

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdx'];

const SYMBOL_NODE_NAMES: Record<string, BreadcrumbItem['type']> = {
  ClassDeclaration: 'class',
  ClassExpression: 'class',
  FunctionDeclaration: 'function',
  FunctionExpression: 'function',
  ArrowFunction: 'function',
  MethodDeclaration: 'method',
  MethodDefinition: 'method',
  class_declaration: 'class',
  function_declaration: 'function',
  arrow_function: 'function',
  method_definition: 'method',
  function_expression: 'function',
};

function isMarkdownFile(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return MARKDOWN_EXTENSIONS.includes(ext);
}

const NAME_NODE_TYPES = new Set([
  'Identifier', 'variable_name', 'property_identifier',
  'type_identifier', 'identifier',
]);

export function getSymbolBreadcrumbs(view: EditorView, fileName: string): BreadcrumbItem[] | null {
  if (isMarkdownFile(fileName)) return null;

  const { state } = view;
  const pos = state.selection.main.head;
  const tree = syntaxTree(state);

  let node = tree.resolveInner(pos, -1);
  const breadcrumbs: BreadcrumbItem[] = [];
  const seen = new Set<number>();

  while (node) {
    const symType = SYMBOL_NODE_NAMES[node.type.name];
    if (symType && !seen.has(node.from)) {
      seen.add(node.from);
      const name = extractNameFromNode(node, state.doc.sliceString.bind(state.doc));
      if (name) {
        breadcrumbs.unshift({ name, type: symType });
      }
    }
    const parent = node.parent;
    if (!parent) break;
    node = parent;
  }

  const baseName = fileName.split('/').pop() || fileName;
  breadcrumbs.push({ name: baseName, type: 'file' });

  return breadcrumbs;
}

function extractNameFromNode(node: any, slice: (from: number, to: number) => string): string | null {
  let cur = node.firstChild;
  while (cur) {
    if (NAME_NODE_TYPES.has(cur.type.name)) {
      return slice(cur.from, cur.to);
    }
    cur = cur.nextSibling;
  }
  return null;
}
