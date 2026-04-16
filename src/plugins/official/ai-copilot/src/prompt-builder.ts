import type { EditorContext } from './providers/types';
import type { ParsedIntent } from './intent-parser';
import { assembleScopedContext } from './context-assembler';
import { getT } from '../../../../i18n';
import type { EditScopeMode } from './providers/types';

const MAX_CONTEXT_LENGTH = 4000;

export type EditResponseOperation = 'replace_selection' | 'insert_at_cursor' | 'rewrite_document';

export interface ParsedEditResponse {
  operation: EditResponseOperation;
  content: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const t = getT();
  return text.slice(0, max) + '\n' + t('aiCopilot.prompt.truncated');
}

export function buildSystemPrompt(context: EditorContext): string {
  const t = getT();
  const scope = context.scope ?? 'document';
  const scoped = assembleScopedContext(context, scope, MAX_CONTEXT_LENGTH);
  const parts = [
    t('aiCopilot.prompt.systemIntro'),
    '',
    t('aiCopilot.prompt.currentFile', { filePath: context.filePath ?? t('aiCopilot.prompt.unsavedFile') }),
    t('aiCopilot.prompt.cursorPosition', { line: context.cursor.line, column: context.cursor.column }),
    t('aiCopilot.prompt.editScope', { scope }),
  ];

  if (context.selection) {
    parts.push('', t('aiCopilot.prompt.selectedText'), '---', context.selection.text, '---');
  }

  if (scoped.strategy === 'smart-window' || scoped.strategy === 'workspace') {
    parts.push('', t('aiCopilot.prompt.documentOutline'), '---', scoped.outline, '---');
  }

  parts.push(
    '',
    t('aiCopilot.prompt.responseInstruction'),
    t('aiCopilot.prompt.codeBlockInstruction'),
  );

  if (scope === 'cursor') {
    parts.push(t('aiCopilot.prompt.cursorModeInstruction'));
  }

  return parts.join('\n');
}

export function buildChatPrompt(
  intent: ParsedIntent,
  context: EditorContext,
): string {
  const t = getT();
  const scope = context.scope ?? intent.target ?? 'document';
  const scoped = assembleScopedContext(context, scope, MAX_CONTEXT_LENGTH);
  const truncated = truncate(scoped.targetText, MAX_CONTEXT_LENGTH);

  switch (intent.action) {
    case 'explain':
      return t('aiCopilot.prompt.explain', { content: truncated });

    case 'summarize':
      return t('aiCopilot.prompt.summarize', { content: truncated });

    case 'translate': {
      const lang = intent.params.language || 'english';
      return t('aiCopilot.prompt.translate', { language: lang, content: truncated });
    }

    case 'format':
      return t('aiCopilot.prompt.format', { content: truncated });

    case 'polish':
      return t('aiCopilot.prompt.polish', { content: truncated });

    case 'edit': {
      const instruction = intent.params.instruction || intent.originalText;
      const responseMode = getEditResponseMode(context, scope);
      const targetLabel =
        scope === 'selection'
          ? t('aiCopilot.prompt.editLabel.selection')
          : scope === 'workspace'
            ? t('aiCopilot.prompt.editLabel.workspace')
            : scope === 'cursor'
              ? t('aiCopilot.prompt.editLabel.cursor')
              : t('aiCopilot.prompt.editLabel.document');
      return t('aiCopilot.prompt.editInstruction', {
        instruction,
        targetLabel,
        responseMode:
          responseMode === 'replace-selection'
            ? t('aiCopilot.prompt.responseMode.replaceSelection')
            : responseMode === 'rewrite-document'
              ? t('aiCopilot.prompt.responseMode.rewriteDocument')
              : t('aiCopilot.prompt.responseMode.insertAtCursor'),
        content: truncated,
      });
    }

    case 'question':
    default: {
      if (scope === 'cursor') {
        const instruction = intent.params.instruction || intent.originalText;
        return t('aiCopilot.prompt.cursorInsertInstruction', { instruction, content: truncated });
      }
      return intent.originalText;
    }
  }
}

/**
 * Try to extract the modified text from an AI response.
 * Supports a structured ```json edit block and markdown fallback blocks.
 */
export function extractModifiedText(response: string): string | null {
  return parseEditResponse(response)?.content ?? null;
}

export function getEditResponseMode(
  context: EditorContext,
  scope: EditScopeMode,
): 'replace-selection' | 'insert-at-cursor' | 'rewrite-document' {
  if (context.selection) return 'replace-selection';
  if (scope === 'tab') return 'rewrite-document';
  return 'insert-at-cursor';
}

export function parseEditResponse(response: string): ParsedEditResponse | null {
  const jsonMatch = response.match(/```json[^\S\r\n]*\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim()) as Partial<ParsedEditResponse>;
      const content = typeof parsed.content === 'string' ? parsed.content : '';
      if (content.length === 0) return null;
      const operation =
        parsed.operation === 'insert_at_cursor' || parsed.operation === 'rewrite_document'
          ? parsed.operation
          : 'replace_selection';
      return { operation, content };
    } catch {
      // Fall through to markdown parsing so freeform fenced responses still work.
    }
  }

  const markdownMatch = response.match(/```(?:markdown|md)?[^\S\r\n]*\n([\s\S]*?)```/);
  if (markdownMatch) {
    return {
      operation: 'replace_selection',
      content: markdownMatch[1],
    };
  }

  // Fallback: if no code block, treat the entire response as content
  const trimmed = response.trim();
  if (trimmed.length > 0) {
    return { operation: 'replace_selection', content: trimmed };
  }

  return null;
}
