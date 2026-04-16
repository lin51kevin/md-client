/**
 * Structured prompt builder — generates system + user prompts that instruct
 * the AI to return JSON edit instructions instead of full markdown text.
 *
 * This runs **alongside** the existing `prompt-builder.ts`. The caller
 * (AICopilotPanel) chooses which builder to use based on
 * {@link choosePromptMode} from `prompt-strategy.ts`.
 */

import type { EditorContext } from './providers/types';
import type { ParsedIntent } from './intent-parser';
import { assembleScopedContext } from './context-assembler';
import { getT } from '../../../../i18n';

const MAX_CONTEXT_LENGTH = 4000;

// ── Structured system prompt ───────────────────────────────────────────────

export function buildStructuredSystemPrompt(context: EditorContext): string {
  const t = getT();
  const scope = context.scope ?? 'document';
  const scoped = assembleScopedContext(context, scope, MAX_CONTEXT_LENGTH);

  const parts = [
    t('aiCopilot.prompt.systemIntro'),
    '',
    '## Response Format: JSON Edit Instructions',
    '',
    'You must respond with a JSON array of edit operations. Each operation describes',
    'a precise modification to the document. Do NOT return full markdown text.',
    '',
    '### Instruction Types:',
    '',
    '1. **replace** — Replace a text fragment',
    '   { "type": "replace", "search": "exact original text", "replace": "new text", "description": "optional" }',
    '',
    '2. **insert_before** — Insert before an anchor text',
    '   { "type": "insert_before", "anchor": "exact anchor text", "content": "text to insert" }',
    '',
    '3. **insert_after** — Insert after an anchor text',
    '   { "type": "insert_after", "anchor": "exact anchor text", "content": "text to insert" }',
    '',
    '4. **delete** — Delete a text fragment',
    '   { "type": "delete", "target": "exact text to remove" }',
    '',
    '5. **multi** — Batch multiple operations (all-or-nothing)',
    '   { "type": "multi", "steps": [ ... ] }',
    '',
    '### Rules:',
    '- `search`/`anchor`/`target` must match the document EXACTLY (spaces, newlines, punctuation)',
    '- Make `search` text unique (≥15 chars when possible) to avoid false matches',
    '- Only modify what needs to change — do NOT include unchanged surrounding text',
    '- Keep valid Markdown formatting in replacement text',
    '- Return ONLY the JSON array, no explanation text',
    '- If no edits needed, return []',
    '- Wrap the JSON in a ```json code block',
    '',
    t('aiCopilot.prompt.currentFile', { filePath: context.filePath ?? t('aiCopilot.prompt.unsavedFile') }),
    t('aiCopilot.prompt.cursorPosition', { line: context.cursor.line, column: context.cursor.column }),
    t('aiCopilot.prompt.editScope', { scope }),
  ];

  if (context.selection) {
    parts.push('', t('aiCopilot.prompt.selectedText'), '---', context.selection.text, '---');
  }

  if (scoped.strategy === 'smart-window' || scoped.strategy === 'workspace') {
    parts.push('', '## Document Outline', '---', scoped.outline, '---');
  }

  return parts.join('\n');
}

// ── Structured user prompt ─────────────────────────────────────────────────

export function buildStructuredChatPrompt(
  intent: ParsedIntent,
  context: EditorContext,
): string {
  const scope = context.scope ?? intent.target ?? 'document';
  const scoped = assembleScopedContext(context, scope, MAX_CONTEXT_LENGTH);

  const parts: string[] = [];

  // ── polish ──
  if (intent.action === 'polish') {
    const target = context.selection?.text ?? scoped.targetText;
    parts.push(
      'Polish the following text. Improve wording, grammar, and readability while',
      'preserving the original meaning and Markdown formatting.',
      'Return JSON edit instructions for the changes.',
      '',
      '---',
      target,
      '---',
    );
    return parts.join('\n');
  }

  // ── delete ──
  if (intent.action === 'delete') {
    const target = context.selection?.text ?? scoped.targetText;
    const instruction = intent.params.instruction || intent.originalText;
    if (context.selection) {
      parts.push(
        `Delete the selected text. Instruction: "${instruction}"`,
        'Return a delete instruction for the selected content.',
        '',
        '---',
        target,
        '---',
      );
    } else {
      parts.push(
        `Identify and delete content matching: "${instruction}"`,
        'Return JSON delete instructions for each piece of text to remove.',
        '',
        '---',
        target,
        '---',
      );
    }
    return parts.join('\n');
  }

  // ── format ──
  if (intent.action === 'format') {
    const target = context.selection?.text ?? scoped.targetText;
    parts.push(
      'Fix Markdown formatting issues: inconsistent headings, malformed lists,',
      'broken tables, missing blank lines, etc.',
      'Return JSON edit instructions for the formatting fixes.',
      '',
      '---',
      target,
      '---',
    );
    return parts.join('\n');
  }

  // ── edit (with various modes) ──
  if (intent.action === 'edit') {
    const mode = intent.params.mode;
    const instruction = intent.params.instruction || intent.originalText;
    const target = context.selection?.text ?? scoped.targetText;

    // Mode-specific prompts
    if (mode === 'rewrite') {
      parts.push(
        `Rewrite the following text: "${instruction}"`,
        'Return JSON edit instructions for the rewritten content.',
        '',
        '---',
        target,
        '---',
      );
    } else if (mode === 'lint') {
      parts.push(
        'Lint and fix Markdown issues in the following text.',
        'Check: heading hierarchy, list indentation, table alignment,',
        'trailing spaces, multiple blank lines, broken links, etc.',
        'Return JSON edit instructions for each fix.',
        '',
        '---',
        target,
        '---',
      );
    } else if (mode === 'fix-links') {
      parts.push(
        'Find and fix broken or malformed links in the following text.',
        'Return JSON edit instructions for each link fix.',
        '',
        '---',
        target,
        '---',
      );
    } else if (mode === 'table-format') {
      parts.push(
        'Fix and optimize the Markdown tables in the following text.',
        'Ensure proper column alignment, separator rows, and cell formatting.',
        'Return JSON edit instructions for each table fix.',
        '',
        '---',
        target,
        '---',
      );
    } else if (mode === 'heading-promote') {
      parts.push(
        'Promote all headings by one level (e.g. ## → #, ### → ##).',
        'Return JSON edit instructions for each heading change.',
        '',
        '---',
        target,
        '---',
      );
    } else if (mode === 'heading-demote') {
      parts.push(
        'Demote all headings by one level (e.g. # → ##, ## → ###).',
        'Return JSON edit instructions for each heading change.',
        '',
        '---',
        target,
        '---',
      );
    } else if (mode === 'toc') {
      parts.push(
        'Generate a table of contents based on the headings in the document.',
        'Insert it at the top of the document, after the first heading if present.',
        'Return a single insert_before instruction.',
        '',
        '---',
        scoped.targetText,
        '---',
      );
    } else if (mode === 'bold' || mode === 'italic' || mode === 'code' || mode === 'list' || mode === 'heading') {
      const formatLabel = mode === 'bold' ? 'bold (**text**)' :
        mode === 'italic' ? 'italic (*text*)' :
        mode === 'code' ? 'inline code (`text`) or code block' :
        mode === 'list' ? 'list (- item)' :
        'heading (# text)';
      parts.push(
        `Convert the selected text to ${formatLabel} format.`,
        'Return JSON edit instructions for the formatting change.',
        '',
        '---',
        target,
        '---',
      );
    } else {
      // Generic edit
      parts.push(
        `Edit instruction: "${instruction}"`,
        'Return JSON edit instructions to apply this change.',
        '',
        '---',
        target,
        '---',
      );
    }
    return parts.join('\n');
  }

  // ── Fallback (shouldn't reach here if choosePromptMode is correct) ──
  const instruction = intent.originalText;
  const target = context.selection?.text ?? scoped.targetText;
  parts.push(
    instruction,
    '',
    'Return JSON edit instructions to apply this change.',
    '',
    '---',
    target,
    '---',
  );
  return parts.join('\n');
}
