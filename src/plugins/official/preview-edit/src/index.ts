import React from 'react';
import { MarkdownAST } from '../../../../lib/markdown-ast';
import { EditHistoryManager } from '../../../../lib/edit-history';
import type { PluginContext } from '../../../../plugin-sandbox';
import type { EditOperation, PositionedNode } from '../../../../types/edit';

/**
 * Preview Editor plugin — makes block elements editable in the preview pane.
 *
 * Supported elements: paragraphs, headings (h1-h6), blockquotes, list items, code blocks.
 *
 * Uses AST-based offset positioning instead of fragile string replacement.
 * Supports undo/redo via Ctrl+Z / Ctrl+Y.
 */

// Map HTML node types to mdast node types
const NODE_TYPE_MAP: Record<string, string> = {
  p: 'paragraph',
  h1: 'heading', h2: 'heading', h3: 'heading',
  h4: 'heading', h5: 'heading', h6: 'heading',
  blockquote: 'blockquote',
  li: 'listItem',
  pre: 'code',
};

const EDITABLE_NODE_TYPES = Object.keys(NODE_TYPE_MAP);

let instanceCounter = 0;

export function activate(ctx: PluginContext) {
  const history = new EditHistoryManager();
  const disposables: Array<{ dispose: () => void }> = [];
  let blockIdCounter = 0;

  // Global keyboard listener for undo/redo
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      const op = history.undo();
      if (op) applyOperation(ctx, op, false);
      e.preventDefault();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      const op = history.redo();
      if (op) applyOperation(ctx, op, true);
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  disposables.push({ dispose: () => window.removeEventListener('keydown', handleKeyDown) });

  for (const htmlNodeType of EDITABLE_NODE_TYPES) {
    const d = ctx.preview.registerRenderer(
      htmlNodeType,
      (props: Record<string, unknown> & { defaultRender: React.ComponentType<Record<string, unknown>> }) => {
        const { defaultRender: DefaultRender, children, ...rest } = props;
        const blockId = `peb_${++blockIdCounter}_${instanceCounter}`;
        return React.createElement(EditableBlockWrapper, {
          nodeType: htmlNodeType,
          astNodeType: NODE_TYPE_MAP[htmlNodeType],
          ctx,
          history,
          blockId,
          defaultRender: DefaultRender,
          children: children as React.ReactNode,
          ...rest,
        });
      },
    );
    disposables.push(d);
  }

  instanceCounter++;

  return {
    deactivate() {
      for (const d of disposables) d.dispose();
      history.clear();
    },
  };
}

/**
 * Apply an edit operation to the source. When `isRedo=true`, we swap before/after.
 */
function applyOperation(ctx: PluginContext, op: EditOperation, isRedo: boolean): void {
  const source = ctx.editor.getContent();
  const ast = new MarkdownAST(source);
  const posMap = ast.buildPositionMap(source);

  // Find the node by its source text match
  const targetText = isRedo ? op.after : op.before;
  const replaceText = isRedo ? op.before : op.after;

  // Find the matching entry by nodeId or by source text
  let entry = posMap.get(op.nodeId);
  if (!entry || entry.sourceText !== targetText) {
    // Fallback: find by exact source text match at the recorded offset
    for (const [, e] of posMap) {
      if (e.sourceText === targetText) {
        entry = e;
        break;
      }
    }
  }

  if (!entry) return;

  ctx.editor.insertText(replaceText, entry.startOffset, entry.endOffset);
}

interface EditableBlockWrapperProps {
  nodeType: string;
  astNodeType: string;
  ctx: PluginContext;
  history: EditHistoryManager;
  blockId: string;
  defaultRender: React.ComponentType<Record<string, unknown>>;
  children: React.ReactNode;
  [key: string]: unknown;
}

function EditableBlockWrapper({
  nodeType, ctx, history, blockId,
  defaultRender: DefaultRender, children, ...rest
}: EditableBlockWrapperProps) {
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const nodeRef = React.useRef<PositionedNode | null>(null);
  const originalTextRef = React.useRef('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Compute rendered text content for matching
  const renderedText = React.useMemo(() => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.join('');
    // For non-text children, use empty string (matching will use AST)
    return '';
  }, [children]);

  const startEditing = React.useCallback(() => {
    if (window.getSelection()?.toString()) return;

    const source = ctx.editor.getContent();
    const ast = new MarkdownAST(source);
    const posMap = ast.buildPositionMap(source);

    // Find the best matching node
    let bestEntry: { startOffset: number; endOffset: number; sourceText: string; node: PositionedNode } | null = null;
    let bestSize = Infinity;

    for (const [, entry] of posMap) {
      if (entry.node.type !== NODE_TYPE_MAP[nodeType]) continue;

      // Check if the rendered text matches the source text (without markdown syntax)
      const plainSource = stripMarkdown(entry.sourceText, entry.node.type);
      if (renderedText && plainSource === renderedText) {
        // Perfect match
        bestEntry = entry;
        break;
      }

      // Use smallest matching block of correct type
      if (!bestEntry) {
        bestEntry = entry;
        bestSize = entry.endOffset - entry.startOffset;
      }
    }

    if (bestEntry) {
      nodeRef.current = bestEntry.node;
      originalTextRef.current = bestEntry.sourceText;
      setEditValue(bestEntry.sourceText);
      setEditing(true);
    }
  }, [ctx, nodeType, renderedText]);

  React.useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const applyEdit = React.useCallback(() => {
    if (!nodeRef.current || editValue === originalTextRef.current) {
      setEditing(false);
      return;
    }

    const source = ctx.editor.getContent();
    const ast = new MarkdownAST(source);
    const posMap = ast.buildPositionMap(source);

    // Find the node again (positions may have shifted due to prior edits)
    const entry = posMap.get(nodeRef.current._nodeId || '')
      ?? findEntryByText(posMap, originalTextRef.current);

    if (entry) {
      // Push to history before modifying
      history.push({
        type: 'block-replace',
        nodeId: entry.node._nodeId || `${entry.node.type}:${entry.startOffset}`,
        before: originalTextRef.current,
        after: editValue,
        timestamp: Date.now(),
      });

      ctx.editor.insertText(editValue, entry.startOffset, entry.endOffset);
    }

    setEditing(false);
  }, [ctx, editValue, history]);

  const cancelEdit = React.useCallback(() => {
    setEditing(false);
  }, []);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      applyEdit();
    }
  }, [applyEdit, cancelEdit]);

  if (editing) {
    return React.createElement('div', {
      style: {
        margin: '8px 0',
        border: '2px solid var(--accent-color, #0969da)',
        borderRadius: 4,
        padding: 8,
        background: 'var(--bg-secondary, #f6f8fa)',
      },
      'data-block-id': blockId,
    }, [
      React.createElement('textarea', {
        key: 'textarea',
        ref: textareaRef,
        value: editValue,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setEditValue(e.target.value),
        onKeyDown: handleKeyDown,
        style: {
          width: '100%',
          minHeight: 60,
          border: '1px solid var(--border-color, #d0d7de)',
          borderRadius: 4,
          padding: 8,
          fontFamily: 'monospace',
          fontSize: 14,
          lineHeight: 1.5,
          resize: 'vertical',
          background: 'var(--bg-primary, #fff)',
          color: 'var(--text-primary, #1f2328)',
          boxSizing: 'border-box' as const,
        },
      }),
      React.createElement('div', {
        key: 'actions',
        style: {
          display: 'flex', gap: 8, marginTop: 4, justifyContent: 'flex-end',
        },
      }, [
        React.createElement('button', {
          key: 'cancel',
          onClick: cancelEdit,
          style: { padding: '4px 12px', cursor: 'pointer' },
        }, 'Cancel'),
        React.createElement('button', {
          key: 'save',
          onClick: applyEdit,
          style: { padding: '4px 12px', cursor: 'pointer', background: 'var(--accent-color, #0969da)', color: '#fff', border: 'none', borderRadius: 4 },
        }, 'Save (Ctrl+Enter)'),
      ]),
    ]);
  }

  const Tag = nodeType as unknown as React.ElementType;
  return React.createElement(Tag, {
    ...rest,
    onClick: startEditing,
    style: {
      ...(rest.style as React.CSSProperties | undefined),
      cursor: 'pointer',
      transition: 'background 0.15s',
    },
    title: 'Click to edit',
    'data-block-id': blockId,
  }, children);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip markdown syntax to get plain text for matching */
function stripMarkdown(text: string, nodeType: string): string {
  switch (nodeType) {
    case 'heading':
      return text.replace(/^#{1,6}\s+/, '').replace(/\n/g, ' ');
    case 'blockquote':
      return text.replace(/^>\s?/gm, '').replace(/\n/g, ' ').trim();
    case 'listItem':
      return text.replace(/^[\s]*[-*+]\s+/, '').replace(/\n/g, ' ').trim();
    case 'code':
      return text.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    default:
      return text.replace(/\n/g, ' ').trim();
  }
}

/** Find a position map entry by its source text */
function findEntryByText(
  posMap: Map<string, { startOffset: number; endOffset: number; sourceText: string; node: PositionedNode }>,
  text: string,
): { startOffset: number; endOffset: number; sourceText: string; node: PositionedNode } | null {
  for (const [, entry] of posMap) {
    if (entry.sourceText === text) return entry;
  }
  return null;
}
