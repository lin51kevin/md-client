/**
 * Structured edit instructions — AI returns precise operations instead of full text.
 *
 * Each instruction describes a single atomic edit. The executor applies them
 * sequentially against the live editor content, using the `from`/`to` offsets
 * from the existing {@link EditAction} interface to stay compatible with the
 * stale-guard and diff-preview pipeline.
 */

// ── Instruction types ──────────────────────────────────────────────────────

export type EditInstruction =
  | ReplaceInstruction
  | InsertBeforeInstruction
  | InsertAfterInstruction
  | DeleteInstruction
  | MultiEditInstruction;

/**
 * Replace a unique text fragment in the document.
 * The executor finds `search` via `indexOf` and replaces the **first** match only.
 */
export interface ReplaceInstruction {
  type: 'replace';
  /** Exact text to find (must be unique enough to avoid false matches). */
  search: string;
  /** Replacement text. */
  replace: string;
  /** Optional human-readable description for diff preview. */
  description?: string;
}

/**
 * Insert content immediately before an anchor text.
 */
export interface InsertBeforeInstruction {
  type: 'insert_before';
  /** Anchor text to position before (exact match, first occurrence). */
  anchor: string;
  /** Content to insert. */
  content: string;
}

/**
 * Insert content immediately after an anchor text.
 */
export interface InsertAfterInstruction {
  type: 'insert_after';
  /** Anchor text to position after (exact match, first occurrence). */
  anchor: string;
  /** Content to insert. */
  content: string;
}

/**
 * Delete a specific text fragment from the document.
 */
export interface DeleteInstruction {
  type: 'delete';
  /** Exact text to remove (first occurrence). */
  target: string;
}

/**
 * Batch multiple edits as an atomic unit (all-or-nothing).
 */
export interface MultiEditInstruction {
  type: 'multi';
  steps: EditInstruction[];
}

// ── Execution result ───────────────────────────────────────────────────────

export interface InstructionExecutionResult {
  success: boolean;
  instruction: EditInstruction;
  /** On success: character offset range that changed. */
  range?: { from: number; to: number };
  /** On failure: human-readable error. */
  error?: string;
}

// ── Strategy detection ─────────────────────────────────────────────────────

/** Determines how the AI response should be processed. */
export type ResponseStrategy = 'structured' | 'text_replace';

/** Valid edit-instruction type names. */
export const VALID_INSTRUCTION_TYPES = [
  'replace',
  'insert_before',
  'insert_after',
  'delete',
  'multi',
] as const;

export type ValidInstructionType = (typeof VALID_INSTRUCTION_TYPES)[number];
