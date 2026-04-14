import React from 'react';
import type { PluginContext } from '../../../plugin-sandbox';

/**
 * Preview Editor plugin — makes headings and paragraphs editable in the preview pane.
 *
 * When the user clicks a heading or paragraph in the preview, it becomes
 * contentEditable. On blur, the edited text is synced back to the source
 * via `editor.insertText`.
 */
export function activate(ctx: PluginContext) {
  const editableNodes = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const disposables: Array<{ dispose: () => void }> = [];

  for (const nodeType of editableNodes) {
    const d = ctx.preview.registerRenderer(
      nodeType,
      (props: Record<string, unknown> & { defaultRender: React.ComponentType<Record<string, unknown>> }) => {
        const { defaultRender: DefaultRender, children, ...rest } = props;
        return React.createElement(EditableBlock, {
          nodeType,
          ctx,
          defaultRender: DefaultRender,
          children: children as React.ReactNode,
          ...rest,
        });
      },
    );
    disposables.push(d);
  }

  return {
    deactivate() {
      for (const d of disposables) d.dispose();
    },
  };
}

interface EditableBlockProps {
  nodeType: string;
  ctx: PluginContext;
  defaultRender: React.ComponentType<Record<string, unknown>>;
  children: React.ReactNode;
  [key: string]: unknown;
}

function EditableBlock({ nodeType, ctx, defaultRender: _default, children, ...rest }: EditableBlockProps) {
  const ref = React.useRef<HTMLElement>(null);
  const [editing, setEditing] = React.useState(false);
  const originalTextRef = React.useRef('');

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    // Don't enter edit mode if user is selecting text
    if (window.getSelection()?.toString()) return;
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    originalTextRef.current = el.textContent ?? '';
    setEditing(true);
  }, []);

  React.useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
    }
  }, [editing]);

  const handleBlur = React.useCallback(() => {
    setEditing(false);
    const el = ref.current;
    if (!el) return;
    const newText = el.textContent ?? '';
    if (newText === originalTextRef.current) return;

    // Find and replace the original text in the source document
    const source = ctx.editor.getContent();
    const idx = source.indexOf(originalTextRef.current);
    if (idx !== -1) {
      ctx.editor.insertText(newText, idx, idx + originalTextRef.current.length);
    }
  }, [ctx]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === 'Escape') {
      const el = ref.current;
      if (el) el.textContent = originalTextRef.current;
      setEditing(false);
    }
  }, []);

  const Tag = nodeType as unknown as React.ElementType;

  return React.createElement(Tag, {
    ...rest,
    ref,
    contentEditable: editing,
    suppressContentEditableWarning: true,
    onClick: handleClick,
    onBlur: handleBlur,
    onKeyDown: editing ? handleKeyDown : undefined,
    style: {
      ...(rest.style as React.CSSProperties | undefined),
      cursor: editing ? 'text' : 'pointer',
      outline: editing ? '2px solid var(--accent-color, #0969da)' : 'none',
      borderRadius: editing ? 3 : undefined,
      padding: editing ? '2px 4px' : undefined,
      minHeight: editing ? '1em' : undefined,
      transition: 'outline 0.15s',
    },
  }, children);
}
