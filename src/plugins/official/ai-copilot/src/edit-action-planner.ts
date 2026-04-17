import { createMarkdownSectionActions } from './markdown-actions';
import type { ParsedIntent } from './intent-parser';
import { parseEditResponse } from './prompt-builder';
import type { EditAction, EditScopeMode, EditorContext } from './providers/types';

export interface PlanEditActionsInput {
  response: string;
  editorCtx: EditorContext;
  scope: EditScopeMode;
  idFactory: (index: number) => string;
  /** The parsed intent — used to build delete actions without AI content. */
  intentAction?: ParsedIntent['action'];
}

export function shouldBuildEditActions(action: ParsedIntent['action']): boolean {
  // Editing actions always produce EditActions (apply / discard UI or bypass auto-apply).
  if (action === 'edit' || action === 'insert' || action === 'delete' || action === 'polish' || action === 'format' || action === 'translate') return true;
  // Informational actions (question, explain, summarize, create_document) only produce a
  // text reply — no EditAction is generated, regardless of the resolved scope.
  return false;
}

export function planEditActions(input: PlanEditActionsInput): EditAction[] {
  const { response, editorCtx, scope, idFactory, intentAction } = input;
  if (scope === 'workspace') return [];

  // ── Delete: produce a delete action directly without AI-generated content ──
  if (intentAction === 'delete') {
    if (editorCtx.selection) {
      return [
        {
          id: idFactory(0),
          type: 'delete',
          description: buildDeleteDescription(editorCtx.selection.text),
          from: editorCtx.selection.from,
          to: editorCtx.selection.to,
          originalText: editorCtx.selection.text,
          newText: '',
          sourceFilePath: editorCtx.filePath,
        },
      ];
    }
    // No selection: delete the entire section or cursor context from the AI response
    // (AI is asked to return what to delete; fall through to normal AI-parse path)
  }

  const parsed = parseEditResponse(response);
  if (!parsed) return [];

  // Respect explicit insert_at_cursor from AI response
  if (parsed.operation === 'insert_at_cursor') {
    return [
      {
        id: idFactory(0),
        type: 'insert',
        description: buildInsertDescription(parsed.content),
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
        description: buildReplaceDescription(editorCtx.selection.text, parsed.content),
        from: editorCtx.selection.from,
        to: editorCtx.selection.to,
        originalText: editorCtx.selection.text,
        newText: parsed.content,
        sourceFilePath: editorCtx.filePath,
      },
    ];
  }

  if (scope === 'tab' || scope === 'document' || scope === 'section' || parsed.operation === 'rewrite_document') {
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
      description: buildInsertDescription(parsed.content),
      from: editorCtx.cursor.offset,
      to: editorCtx.cursor.offset,
      originalText: '',
      newText: parsed.content,
      sourceFilePath: editorCtx.filePath,
    },
  ];
}

// ── Description helpers ──────────────────────────────────────────────────────

function truncatePreview(text: string, maxLen = 20): string {
  const single = text.replace(/\s+/g, ' ').trim();
  if (single.length <= maxLen) return single;
  return single.slice(0, maxLen) + '…';
}

function buildReplaceDescription(original: string, modified: string): string {
  const from = truncatePreview(original);
  const to = truncatePreview(modified);
  if (from && to && from !== to) return `替换 "${from}" → "${to}"`;
  return '替换选中文本';
}

function buildDeleteDescription(original: string): string {
  const preview = truncatePreview(original);
  const lines = original.split('\n').length;
  if (lines > 1) return `删除 ${lines} 行`;
  return `删除 "${preview}"`;
}

function buildInsertDescription(content: string): string {
  const lines = content.split('\n').length;
  if (lines > 1) return `在光标处插入（${lines} 行）`;
  return `在光标处插入 "${truncatePreview(content)}"`;
}
