import type { EditorContext } from './providers/types';
import type { ParsedIntent } from './intent-parser';

const MAX_CONTEXT_LENGTH = 4000;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n... (内容已截断)';
}

export function buildSystemPrompt(context: EditorContext): string {
  const parts = [
    '你是 MarkLite 的 AI 助手，专门帮助用户编辑 Markdown 文档。',
    '',
    `当前文件: ${context.filePath ?? '(未保存)'}`,
    `光标位置: 第${context.cursor.line}行, 第${context.cursor.column}列`,
  ];

  if (context.selection) {
    parts.push('', '用户选中的文本:', '---', context.selection.text, '---');
  }

  parts.push(
    '',
    '请用简洁的中文回复。如果需要修改文档，请直接给出修改后的内容。',
    '如果给出修改后的内容，请用 ```markdown 代码块包裹。',
  );

  return parts.join('\n');
}

export function buildChatPrompt(
  intent: ParsedIntent,
  context: EditorContext,
): string {
  const targetText = context.selection?.text ?? context.content;
  const truncated = truncate(targetText, MAX_CONTEXT_LENGTH);

  switch (intent.action) {
    case 'explain':
      return `请解释以下内容:\n\n${truncated}`;

    case 'summarize':
      return `请总结以下文档的要点:\n\n${truncated}`;

    case 'translate': {
      const lang = intent.params.language || 'english';
      return `请将以下内容翻译成${lang}:\n\n${truncated}`;
    }

    case 'format':
      return `请格式化整理以下 Markdown 内容，保持语义不变:\n\n${truncated}`;

    case 'edit': {
      const instruction = intent.params.instruction || intent.originalText;
      return `用户指令: ${instruction}\n\n当前${context.selection ? '选中文本' : '文档内容'}:\n---\n${truncated}\n---\n\n请根据指令修改上述内容，直接给出修改后的文本 (用 \`\`\`markdown 代码块包裹)。`;
    }

    case 'question':
    default:
      return intent.originalText;
  }
}

/**
 * Try to extract the modified text from an AI response.
 * Looks for ```markdown code blocks.
 */
export function extractModifiedText(response: string): string | null {
  const match = response.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}
