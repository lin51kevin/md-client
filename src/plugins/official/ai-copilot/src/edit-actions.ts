import type { EditAction, EditScopeMode, EditorContext } from './providers/types';
import { validateActionAgainstCurrentContent } from './stale-guard';
import { planEditActions } from './edit-action-planner';
import { parseEditInstructions } from './instruction-parser';
import { executeInstructions } from './instruction-executor';
import type { ReplaceInstruction } from './types/edit-instruction';

/**
 * Build edit actions from AI response.
 * Tries structured instruction path first, falls back to traditional full-text replace.
 */
export function buildActions(
  response: string,
  editorCtx: EditorContext,
  scope: EditScopeMode,
  intentAction: string | undefined,
  nextId: () => string,
): EditAction[] {
  // ── Try structured instruction path first ──
  const instructions = parseEditInstructions(response);
  if (instructions !== null) {
    const result = executeInstructions({
      docSnapshot: editorCtx.content,
      instructions,
      filePath: editorCtx.filePath,
      idFactory: nextId,
    });
    if (result.allSuccess && result.actions.length > 0) {
      return result.actions;
    }
    if (result.actions.length > 0) {
      console.warn(
        `[AI Copilot] Structured instructions partially failed (${result.results.filter(r => !r.success).length} failed), using ${result.actions.length} successful actions`,
      );
      return result.actions;
    }
    const salvaged = salvageActionsFromInstructions(instructions, editorCtx, nextId);
    if (salvaged.length > 0) {
      console.warn('[AI Copilot] Structured instructions failed to locate text; using selection-based fallback');
      return salvaged;
    }
    console.warn('[AI Copilot] All structured instructions failed; no applicable actions produced');
    return [];
  }

  // ── Traditional full-text replace path ──
  return planEditActions({
    response,
    editorCtx,
    scope,
    intentAction: intentAction as import('./intent-parser').ParsedIntent['action'] | undefined,
    idFactory: nextId,
  });
}

/**
 * When structured instructions fail to locate their search text,
 * fall back to replacing the active selection with combined replacement content.
 */
export function salvageActionsFromInstructions(
  instructions: ReturnType<typeof parseEditInstructions>,
  editorCtx: EditorContext,
  nextId: () => string,
): EditAction[] {
  if (!editorCtx.selection || !instructions || instructions.length === 0) return [];

  const parts: string[] = [];
  for (const inst of instructions) {
    if (inst.type === 'replace') {
      parts.push((inst as ReplaceInstruction).replace);
    }
  }
  if (parts.length === 0) return [];

  return [
    {
      id: nextId(),
      type: 'replace',
      description: parts.length === 1
        ? `替换为: "${parts[0].slice(0, 40)}${parts[0].length > 40 ? '…' : ''}"`
        : `应用 ${parts.length} 处 AI 修改`,
      from: editorCtx.selection.from,
      to: editorCtx.selection.to,
      originalText: editorCtx.selection.text,
      newText: parts.join('\n'),
      sourceFilePath: editorCtx.filePath,
    },
  ];
}

/**
 * Validate and apply a single edit action.
 * Returns true if applied successfully.
 */
export function tryApplyAction(
  action: EditAction,
  editor: {
    getActiveFilePath: () => string | undefined;
    getContent: () => string;
    insertText: (text: string, from: number, to: number) => void;
    replaceRange: (from: number, to: number, text: string) => void;
  },
  workspace: {
    openFile: (path: string) => void;
  },
  prevalidatedContent?: string,
): { applied: boolean; switchedFile?: boolean; stale?: boolean } {
  const currentPath = editor.getActiveFilePath();
  if (action.sourceFilePath && currentPath !== action.sourceFilePath) {
    workspace.openFile(action.sourceFilePath);
    return { applied: false, switchedFile: true };
  }

  const contentToCheck = prevalidatedContent ?? editor.getContent();
  const validation = validateActionAgainstCurrentContent(action, contentToCheck);
  if (!validation.valid) {
    return { applied: false, stale: true };
  }

  switch (action.type) {
    case 'insert':
      editor.insertText(action.newText, action.from, action.to);
      return { applied: true };
    case 'delete':
      editor.replaceRange(action.from, action.to, '');
      return { applied: true };
    case 'replace':
    default:
      editor.replaceRange(action.from, action.to, action.newText);
      return { applied: true };
  }
}

/**
 * Validate all actions first, then apply in reverse offset order.
 * Stops before applying if any validation fails.
 */
export function applyActionsBatch(
  actions: EditAction[],
  editor: {
    getContent: () => string;
    insertText: (text: string, from: number, to: number) => void;
    replaceRange: (from: number, to: number, text: string) => void;
  },
): { appliedCount: number; totalCount: number } {
  const currentContent = editor.getContent();
  const ordered = [...actions].sort((a, b) => b.from - a.from || b.to - a.to);

  for (const action of ordered) {
    const validation = validateActionAgainstCurrentContent(action, currentContent);
    if (!validation.valid) {
      return { appliedCount: 0, totalCount: actions.length };
    }
  }

  let appliedCount = 0;
  for (const action of ordered) {
    switch (action.type) {
      case 'insert':
        editor.insertText(action.newText, action.from, action.to);
        appliedCount += 1;
        break;
      case 'delete':
        editor.replaceRange(action.from, action.to, '');
        appliedCount += 1;
        break;
      case 'replace':
      default:
        editor.replaceRange(action.from, action.to, action.newText);
        appliedCount += 1;
        break;
    }
  }
  return { appliedCount, totalCount: actions.length };
}
