/**
 * Instruction executor — applies structured {@link EditInstruction}s against
 * the editor content and converts them into the existing {@link EditAction}
 * format so the stale-guard, diff-preview, and apply pipeline work unchanged.
 *
 * This file is deliberately editor-agnostic: it works with plain strings and
 * character offsets. The actual `replaceRange`/`insertText` calls happen
 * through the existing `tryApplyAction` path in `AICopilotPanel.tsx`.
 */

import type { EditAction } from './providers/types';
import type {
  EditInstruction,
  InstructionExecutionResult,
  ReplaceInstruction,
  DeleteInstruction,
  MultiEditInstruction,
} from './types/edit-instruction';

export interface ExecuteInstructionsInput {
  /** The full document content at the time of AI request (for stale detection). */
  docSnapshot: string;
  /** Structured edit instructions from AI. */
  instructions: EditInstruction[];
  /** File path for the edit actions. */
  filePath: string | null;
  /** Factory for unique action IDs. */
  idFactory: () => string;
}

export interface ExecuteInstructionsOutput {
  actions: EditAction[];
  results: InstructionExecutionResult[];
  /** True if every instruction was successfully converted to an action. */
  allSuccess: boolean;
}

/**
 * Convert structured instructions into {@link EditAction}s that can be
 * applied through the existing pipeline.
 *
 * Important: actions are computed against `docSnapshot`. The stale-guard
 * in `AICopilotPanel.tsx` will re-validate against live content before
 * the user applies them.
 */
export function executeInstructions(input: ExecuteInstructionsInput): ExecuteInstructionsOutput {
  const { docSnapshot, instructions, filePath, idFactory } = input;
  const results: InstructionExecutionResult[] = [];
  const actions: EditAction[] = [];

  for (const inst of instructions) {
    const result = resolveInstruction(inst, docSnapshot, filePath, idFactory);
    results.push(result);
    if (result.actions) {
      // Multi-step: include all resolved sub-actions regardless of partial failure
      actions.push(...result.actions);
    } else if (result.success && result.action) {
      actions.push(result.action);
    }
  }

  return {
    actions,
    results,
    allSuccess: results.every((r) => r.success),
  };
}

// ── Internal ───────────────────────────────────────────────────────────────

interface ResolvedResult extends InstructionExecutionResult {
  action?: EditAction;
  /** Only set by resolveMulti — carries all sub-step actions. */
  actions?: EditAction[];
}

function resolveInstruction(
  inst: EditInstruction,
  doc: string,
  filePath: string | null,
  idFactory: () => string,
): ResolvedResult {
  switch (inst.type) {
    case 'replace':
      return resolveReplace(inst, doc, filePath, idFactory);
    case 'insert_before':
      return resolveInsert(inst.anchor, inst.content, doc, filePath, idFactory, 'before');
    case 'insert_after':
      return resolveInsert(inst.anchor, inst.content, doc, filePath, idFactory, 'after');
    case 'delete':
      return resolveDelete(inst, doc, filePath, idFactory);
    case 'multi':
      return resolveMulti(inst, doc, filePath, idFactory);
    default: {
      const unknown = inst as Record<string, unknown>;
      return {
        success: false,
        instruction: inst,
        error: `Unknown instruction type: ${String(unknown.type)}`,
      };
    }
  }
}

function resolveReplace(
  inst: ReplaceInstruction,
  doc: string,
  filePath: string | null,
  idFactory: () => string,
): ResolvedResult {
  const index = doc.indexOf(inst.search);

  if (index === -1) {
    return {
      success: false,
      instruction: inst,
      error: `Search text not found in document (first 30 chars: "${inst.search.slice(0, 30)}...")`,
    };
  }

  const from = index;
  const to = index + inst.search.length;

  const preview = inst.search.replace(/\s+/g, ' ').trim();
  const desc = inst.description ?? `替换 "${truncate(preview, 25)}"`;

  return {
    success: true,
    instruction: inst,
    range: { from, to },
    action: {
      id: idFactory(),
      type: 'replace',
      description: desc,
      from,
      to,
      originalText: inst.search,
      newText: inst.replace,
      sourceFilePath: filePath,
    },
  };
}

function resolveInsert(
  anchor: string,
  content: string,
  doc: string,
  filePath: string | null,
  idFactory: () => string,
  position: 'before' | 'after',
): ResolvedResult {
  const index = doc.indexOf(anchor);

  if (index === -1) {
    return {
      success: false,
      instruction: { type: position === 'before' ? 'insert_before' : 'insert_after', anchor, content },
      error: `Anchor text not found in document (first 30 chars: "${anchor.slice(0, 30)}...")`,
    };
  }

  const insertAt = position === 'before' ? index : index + anchor.length;
  const posLabel = position === 'before' ? '前' : '后';
  const anchorPreview = anchor.replace(/\s+/g, ' ').trim();

  return {
    success: true,
    instruction: { type: position === 'before' ? 'insert_before' : 'insert_after', anchor, content },
    range: { from: insertAt, to: insertAt },
    action: {
      id: idFactory(),
      type: 'insert',
      description: `在 "${truncate(anchorPreview, 20)}" ${posLabel}插入`,
      from: insertAt,
      to: insertAt,
      originalText: '',
      newText: content,
      sourceFilePath: filePath,
    },
  };
}

function resolveDelete(
  inst: DeleteInstruction,
  doc: string,
  filePath: string | null,
  idFactory: () => string,
): ResolvedResult {
  const index = doc.indexOf(inst.target);

  if (index === -1) {
    return {
      success: false,
      instruction: inst,
      error: `Delete target not found in document (first 30 chars: "${inst.target.slice(0, 30)}...")`,
    };
  }

  const from = index;
  const to = index + inst.target.length;
  const preview = inst.target.replace(/\s+/g, ' ').trim();

  return {
    success: true,
    instruction: inst,
    range: { from, to },
    action: {
      id: idFactory(),
      type: 'delete',
      description: `删除 "${truncate(preview, 25)}"`,
      from,
      to,
      originalText: inst.target,
      newText: '',
      sourceFilePath: filePath,
    },
  };
}

function resolveMulti(
  inst: MultiEditInstruction,
  doc: string,
  filePath: string | null,
  idFactory: () => string,
): ResolvedResult {
  const subResults: ResolvedResult[] = [];

  // Execute steps in order; each step sees the *original* document,
  // so offsets don't shift between steps. This is safe because we only
  // produce EditActions (offsets relative to the snapshot), not mutate
  // the document directly.
  for (const step of inst.steps) {
    const result = resolveInstruction(step, doc, filePath, idFactory);
    subResults.push(result);
  }

  const allSuccess = subResults.length > 0 && subResults.every((r) => r.success);
  const actions = subResults.filter((r): r is ResolvedResult & { action: EditAction } => r.action !== undefined).map((r) => r.action!);

  return {
    success: allSuccess,
    instruction: inst,
    error: allSuccess ? undefined : `Multi-edit: ${subResults.filter((r) => !r.success).length} step(s) failed`,
    actions,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}
