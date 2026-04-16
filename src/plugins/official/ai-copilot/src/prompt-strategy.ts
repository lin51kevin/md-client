/**
 * Prompt strategy — determines whether a given intent should produce structured
 * edit instructions or fall back to the traditional full-text replace flow.
 *
 * Structured mode works best for precise, targeted edits.
 * Full-text mode is better for generative / freeform tasks.
 *
 * Note: Many slash commands (rewrite, lint, fix-links, etc.) map to `action: 'edit'`
 * with different `params.mode` values. We check `params.mode` to distinguish them.
 */

import type { ParsedIntent } from './intent-parser';

export type PromptMode = 'structured' | 'fulltext';

/**
 * Choose the prompt mode based on the parsed intent.
 *
 * | Intent                   | Mode        | Rationale                                       |
 * |--------------------------|-------------|--------------------------------------------------|
 * | polish (action)          | structured  | Precise text rewrites                           |
 * | edit + mode=rewrite      | structured  | Precise text rewrites                           |
 * | edit + mode=lint         | structured  | Precise formatting fixes                        |
 * | edit + mode=fix-links    | structured  | Precise link modifications                      |
 * | edit + mode=table-format | structured  | Precise table restructuring                     |
 * | edit + mode=heading-*    | structured  | Precise heading level changes                   |
 * | edit + mode=toc          | structured  | Precise insertion at document top               |
 * | edit + mode=todo         | fulltext    | May need context-aware generation               |
 * | edit + mode=expand       | fulltext    | Generative — AI creates new content             |
 * | edit (generic)           | structured  | Precise find-replace operations                 |
 * | format (action)          | structured  | Precise formatting changes                      |
 * | delete (action)          | structured  | Precise deletion targeting                      |
 * | translate (action)       | fulltext    | Content may change significantly                |
 * | insert (action)          | fulltext    | Generative — AI creates new content             |
 * | summarize (action)       | fulltext    | Informational only — no edit needed             |
 * | explain (action)         | fulltext    | Informational only — no edit needed             |
 * | question (action)        | fulltext    | Free-form chat                                  |
 * | create_document (action) | fulltext    | Generative — AI creates new content             |
 */
export function choosePromptMode(intent: ParsedIntent): PromptMode {
  const { action, params } = intent;

  switch (action) {
    // ── Always structured ──
    case 'polish':
      return 'structured';

    case 'edit': {
      const mode = params.mode;
      // Structured: precise modifications
      if (mode === 'rewrite') return 'structured';
      if (mode === 'lint') return 'structured';
      if (mode === 'fix-links') return 'structured';
      if (mode === 'table-format') return 'structured';
      if (mode === 'heading-promote') return 'structured';
      if (mode === 'heading-demote') return 'structured';
      if (mode === 'toc') return 'structured';
      if (mode === 'bold') return 'structured';
      if (mode === 'italic') return 'structured';
      if (mode === 'code') return 'structured';
      if (mode === 'list') return 'structured';
      if (mode === 'heading') return 'structured';
      // Generative: needs full context understanding
      if (mode === 'expand') return 'fulltext';
      if (mode === 'todo') return 'fulltext';
      // Generic edit: default to structured (best for precise changes)
      return 'structured';
    }

    case 'format':
      return 'structured';

    case 'delete':
      return 'structured';

    // ── Always fulltext (generative / informational) ──
    case 'translate':
    case 'insert':
    case 'summarize':
    case 'explain':
    case 'question':
    case 'create_document':
      return 'fulltext';

    default:
      return 'fulltext';
  }
}
