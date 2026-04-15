import type { EditorContext } from './providers/types';
import type { ParsedIntent } from './intent-parser';
import { assembleScopedContext } from './context-assembler';
import { getT } from '../../../../i18n';

const MAX_CONTEXT_LENGTH = 4000;

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

    case 'edit': {
      const instruction = intent.params.instruction || intent.originalText;
      const targetLabel =
        scope === 'selection'
          ? t('aiCopilot.prompt.editLabel.selection')
          : scope === 'workspace'
            ? t('aiCopilot.prompt.editLabel.workspace')
            : t('aiCopilot.prompt.editLabel.document');
      return t('aiCopilot.prompt.editInstruction', { instruction, targetLabel, content: truncated });
    }

    case 'question':
    default:
      return intent.originalText;
  }
}

/**
 * Try to extract the modified text from an AI response.
 * Looks for ```markdown code blocks.
    case 'create_document': {
      const description = intent.params.instruction || intent.originalText;
      return `请根据以下需求，创建一个完整的 Markdown 文档:\n\n${description}\n\n请用 \`\`\`markdown 代码块包裹文档内容。`;
    }
 */
export function extractModifiedText(response: string): string | null {
  const match = response.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}
