import { createMarkdownSectionActions } from './markdown-actions';
import type { ParsedIntent } from './intent-parser';
import { parseEditResponse } from './prompt-builder';
import type { EditAction, EditScopeMode, EditorContext } from './providers/types';

export interface PlanEditActionsInput {
  response: string;
  editorCtx: EditorContext;
  scope: EditScopeMode;
  idFactory: (index: number) => string;
}

export function shouldBuildEditActions(action: ParsedIntent['action'], scope?: EditScopeMode): boolean {
  if (action === 'edit' || action === 'polish' || action === 'format' || action === 'translate') return true;
  if (scope === 'cursor') return true;
  return false;
}

export function planEditActions(input: PlanEditActionsInput): EditAction[] {
  const { response, editorCtx, scope, idFactory } = input;
  if (scope === 'workspace') return [];

  const parsed = parseEditResponse(response);
  if (!parsed) return [];

  // Respect explicit insert_at_cursor from AI response
  if (parsed.operation === 'insert_at_cursor') {
    return [
      {
        id: idFactory(0),
        type: 'insert',
        description: '在光标处插入',
        from: editorCtx.cursor.offset,
        to: editorCtx.cursor.offset,
        originalText: '',
        newText: parsed.content,
        sourceFilePath: editorCtx.filePath,
      },
    ];
  }

  if (editorCtx.selection) {
    return [
      {
        id: idFactory(0),
        type: 'replace',
        description: '替换选中文本',
        from: editorCtx.selection.from,
        to: editorCtx.selection.to,
        originalText: editorCtx.selection.text,
        newText: parsed.content,
        sourceFilePath: editorCtx.filePath,
      },
    ];
  }

  if (scope === 'tab' || scope === 'document' || parsed.operation === 'rewrite_document') {
    return createMarkdownSectionActions({
      original: editorCtx.content,
      modified: parsed.content,
      baseFrom: 0,
      filePath: editorCtx.filePath,
      idFactory,
    });
  }

  return [
    {
      id: idFactory(0),
      type: 'insert',
      description: '在光标处插入',
      from: editorCtx.cursor.offset,
      to: editorCtx.cursor.offset,
      originalText: '',
      newText: parsed.content,
      sourceFilePath: editorCtx.filePath,
    },
  ];
}
