import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface EditableBlockProps {
  nodeType: string;
  astNodeType?: string;
  sourceText: string;
  startOffset: number;
  endOffset: number;
  defaultRender: React.ComponentType<Record<string, unknown>>;
  children: React.ReactNode;
  onApplyEdit: (startOffset: number, endOffset: number, newText: string) => void;
  [key: string]: unknown;
}

export const EditableBlock: React.FC<EditableBlockProps> = ({
  nodeType,
  sourceText,
  startOffset,
  endOffset,
  defaultRender: DefaultRender,
  children,
  onApplyEdit,
  ...rest
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDoubleClick = useCallback(() => {
    setEditing(true);
    setEditText(sourceText);
  }, [sourceText]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const applyEdit = useCallback(() => {
    setEditing(false);
    if (editText === sourceText) return;
    onApplyEdit(startOffset, endOffset, editText);
  }, [editText, sourceText, startOffset, endOffset, onApplyEdit]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        applyEdit();
      }
    },
    [applyEdit, cancelEdit],
  );

  if (editing) {
    return (
      <div
        style={{
          border: '2px solid #0969da',
          borderRadius: 4,
          padding: 8,
          margin: 4,
        }}
      >
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            minHeight: 60,
            fontFamily: 'monospace',
            fontSize: 14,
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={applyEdit}
            style={{
              padding: '2px 12px',
              cursor: 'pointer',
              background: '#0969da',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
            }}
            data-testid="editable-block-confirm"
          >
            ✓ 确认
          </button>
          <button
            onClick={cancelEdit}
            style={{
              padding: '2px 12px',
              cursor: 'pointer',
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: 3,
            }}
            data-testid="editable-block-cancel"
          >
            ✕ 取消
          </button>
        </div>
      </div>
    );
  }

  const Tag = nodeType as unknown as React.ElementType;
  return (
    <Tag
      {...rest}
      onDoubleClick={handleDoubleClick}
      style={{
        ...(rest.style as React.CSSProperties | undefined),
        cursor: 'pointer',
      }}
    >
      {children}
    </Tag>
  );
};
