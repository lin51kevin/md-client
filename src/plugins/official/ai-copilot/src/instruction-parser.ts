/**
 * Instruction parser — extracts structured edit operations from AI response text.
 *
 * Supports:
 *  - JSON arrays inside markdown code blocks (```json ... ```)
 *  - Bare JSON arrays (no code block wrapping)
 *  - Graceful fallback to "text_replace" strategy when parsing fails
 */

import type { EditInstruction, ResponseStrategy, ValidInstructionType } from './types/edit-instruction';
import { VALID_INSTRUCTION_TYPES } from './types/edit-instruction';

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Determine whether the AI response should be processed as structured
 * instructions or fall back to the traditional full-text replace flow.
 */
export function detectResponseStrategy(raw: string): ResponseStrategy {
  try {
    const jsonStr = extractJsonString(raw);
    if (!jsonStr) return 'text_replace';

    const parsed = JSON.parse(jsonStr);

    // Valid: non-empty array with at least one object that has a `type` field
    if (Array.isArray(parsed) && parsed.length >= 0 && isInstructionArray(parsed)) {
      return 'structured';
    }
  } catch {
    // Not valid JSON — fall through
  }
  return 'text_replace';
}

/**
 * Parse an AI response into an array of validated {@link EditInstruction}s.
 *
 * Returns `null` when the response is not structured instructions
 * (caller should fall back to `parseEditResponse` from `prompt-builder.ts`).
 */
export function parseEditInstructions(raw: string): EditInstruction[] | null {
  const strategy = detectResponseStrategy(raw);
  if (strategy !== 'structured') return null;

  const jsonStr = extractJsonString(raw);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr);
    const instructions = Array.isArray(parsed) ? parsed : [parsed];
    return validateInstructions(instructions);
  } catch {
    return null;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Extract JSON string from either a fenced code block or raw text.
 */
function extractJsonString(raw: string): string | null {
  // 1. Try ```json ... ```
  const codeBlockMatch = raw.match(/```json[^\S\r\n]*\n([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // 2. Try ``` ... ``` (generic fence)
  const genericMatch = raw.match(/```[^\S\r\n]*\n([\s\S]*?)```/);
  if (genericMatch) {
    const inner = genericMatch[1].trim();
    if (inner.startsWith('[') || inner.startsWith('{')) return inner;
  }

  // 3. Try raw text that starts with [ (array of instructions)
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) return trimmed;

  return null;
}

/**
 * Check if the array elements look like valid instructions.
 */
function isInstructionArray(arr: unknown[]): boolean {
  if (arr.length === 0) return true; // Empty array = no edits needed
  return arr.some(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      typeof (item as Record<string, unknown>).type === 'string' &&
      (VALID_INSTRUCTION_TYPES as readonly string[]).includes((item as Record<string, unknown>).type as string),
  );
}

/**
 * Validate and filter instruction objects.
 */
function validateInstructions(instructions: unknown[]): EditInstruction[] {
  const result: EditInstruction[] = [];
  const validSet = new Set<string>(VALID_INSTRUCTION_TYPES);

  for (const inst of instructions) {
    if (typeof inst !== 'object' || inst === null) continue;

    const record = inst as Record<string, unknown>;
    const type = String(record.type ?? '');

    if (!validSet.has(type)) {
      console.warn(`[AI Copilot] Unknown instruction type: "${type}", skipping`);
      continue;
    }

    // Type-specific validation
    if (!validateInstructionFields(type as ValidInstructionType, record)) {
      console.warn(`[AI Copilot] Instruction validation failed for type "${type}", skipping`);
      continue;
    }

    result.push(inst as EditInstruction);
  }

  return result;
}

/**
 * Validate required fields per instruction type.
 */
function validateInstructionFields(type: ValidInstructionType, record: Record<string, unknown>): boolean {
  switch (type) {
    case 'replace':
      return typeof record.search === 'string' && typeof record.replace === 'string' && record.search.length > 0;
    case 'insert_before':
    case 'insert_after':
      return typeof record.anchor === 'string' && typeof record.content === 'string' && record.anchor.length > 0;
    case 'delete':
      return typeof record.target === 'string' && record.target.length > 0;
    case 'multi':
      return Array.isArray(record.steps) && record.steps.length > 0;
    default:
      return false;
  }
}
