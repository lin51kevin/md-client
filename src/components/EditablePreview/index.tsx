import React, { useState, useMemo, useCallback } from 'react';
import { MarkdownAST } from '../../lib/markdown-ast';
import { EditableBlock } from './EditableBlock';
import { InlineToolbar } from './InlineToolbar';
import type { PositionedNode, PositionMapEntry } from '../../types/edit';

export interface EditablePreviewProps {
  content: string;
  onContentChange: (newContent: string) => void;
}

// Map AST node types to HTML tag names for react-markdown renderer
const NODE_TYPE_TO_TAG: Record<string, string> = {
  paragraph: 'p',
  heading: 'h1',
  blockquote: 'blockquote',
  listItem: 'li',
  code: 'pre',
};

// AST node types we want to make editable
const EDITABLE_TYPES = new Set(['paragraph', 'heading', 'blockquote', 'listItem', 'code']);

export const EditablePreview: React.FC<EditablePreviewProps> = ({ content, onContentChange }) => {
  const ast = useMemo(() => new MarkdownAST(content), [content]);
  const positionMap = useMemo(() => ast.buildPositionMap(content), [ast, content]);

  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  // Collect editable entries (skip root, list containers)
  const editableEntries = useMemo(() => {
    const entries: { key: string; entry: PositionMapEntry }[] = [];
    for (const [key, entry] of positionMap) {
      if (EDITABLE_TYPES.has(entry.node.type) && entry.node.type !== 'root' && entry.node.type !== 'list') {
        entries.push({ key, entry });
      }
    }
    return entries;
  }, [positionMap]);

  const handleApplyEdit = useCallback(
    (startOffset: number, endOffset: number, newText: string) => {
      const newContent =
        content.slice(0, startOffset) + newText + content.slice(endOffset);
      onContentChange(newContent);
    },
    [content, onContentChange],
  );

  const handleFormat = useCallback((type: string) => {
    // Phase 2: inline formatting — placeholder
    void type;
  }, []);

  // For now, render the markdown content with editable block wrappers
  // We use react-markdown's component overrides
  const components = useMemo(() => {
    // Reset consumed-key tracking so duplicate AST nodes are assigned sequentially
    resetFindBestMatchState();
    const result: Record<string, React.ComponentType<any>> = {};

    for (const [astType, tag] of Object.entries(NODE_TYPE_TO_TAG)) {
      result[tag] = (props: any) => {
        // Find matching entry from position map
        // Simple approach: use the first matching node type entry
        // In production, we'd use a more precise matching strategy
        const matchingEntry = findBestMatch(editableEntries, astType, props);

        if (!matchingEntry) {
          // Fallback: render as-is
          const Tag = tag as unknown as React.ElementType;
          return <Tag {...props}>{props.children}</Tag>;
        }

        return (
          <EditableBlock
            nodeType={tag}
            astNodeType={astType}
            sourceText={matchingEntry.entry.sourceText}
            startOffset={matchingEntry.entry.startOffset}
            endOffset={matchingEntry.entry.endOffset}
            defaultRender={() => {
              const Tag = tag as unknown as React.ElementType;
              return <Tag {...props}>{props.children}</Tag>;
            }}
            onApplyEdit={handleApplyEdit}
          >
            {props.children}
          </EditableBlock>
        );
      };
    }

    return result;
  }, [editableEntries, handleApplyEdit]);

  return (
    <div className="editable-preview" data-testid="editable-preview">
      {/* We render the editable entries as blocks for testing; */}
      {/* Full react-markdown integration is T5 */}
      {editableEntries.map(({ key, entry }) => {
        const tag = NODE_TYPE_TO_TAG[entry.node.type] || 'p';
        const Tag = tag as unknown as React.ElementType;
        return (
          <Tag key={key} data-testid={`editable-${entry.node.type}`}>
            <EditableBlock
              nodeType="span"
              astNodeType={entry.node.type}
              sourceText={entry.sourceText}
              startOffset={entry.startOffset}
              endOffset={entry.endOffset}
              defaultRender={() => <span>{entry.sourceText}</span>}
              onApplyEdit={handleApplyEdit}
            >
              {entry.sourceText}
            </EditableBlock>
          </Tag>
        );
      })}
      <InlineToolbar
        visible={toolbarVisible}
        position={toolbarPosition}
        onFormat={handleFormat}
      />
    </div>
  );
};

// Track consumed entry keys per render cycle to avoid assigning the same node twice.
// Each call pops the first unconsumed entry of the requested type.
const _consumedKeys = new Set<string>();

export function resetFindBestMatchState(): void {
  _consumedKeys.clear();
}

function findBestMatch(
  entries: { key: string; entry: PositionMapEntry }[],
  astType: string,
  _props: any,
): { key: string; entry: PositionMapEntry } | null {
  const match = entries.find(
    (e) => e.entry.node.type === astType && !_consumedKeys.has(e.key),
  );
  if (match) {
    _consumedKeys.add(match.key);
  }
  return match ?? null;
}
