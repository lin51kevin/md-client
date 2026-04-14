/**
 * 自动格式化 Markdown
 * 根据目标节点类型，将用户输入的纯文本转换为正确的 Markdown 格式
 */

/**
 * 确保文本以换行符结尾
 */
export function ensureTrailingNewline(text: string): string {
  if (!text.endsWith('\n')) return text + '\n';
  return text;
}

/**
 * 去除多余的空行（连续空行合并为一个）
 */
export function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * 确保引用块每行都有 > 前缀
 */
export function formatBlockquote(text: string, depth: number = 1): string {
  const prefix = Array.from({ length: depth }, () => '> ').join('');
  return prefix + text.replace(/\n/g, '\n' + prefix) + '\n';
}

/**
 * 格式化列表项
 */
export function formatListItem(
  text: string,
  ordered: boolean,
  index: number,
  depth: number = 0,
): string {
  const indent = '  '.repeat(depth);
  const bullet = ordered ? `${index}. ` : '- ';
  return indent + bullet + text;
}

/**
 * 格式化代码块（保持用户输入不变，仅确保围栏标记）
 */
export function formatCodeBlock(text: string, lang?: string): string {
  const fence = lang ? `\`\`\`${lang}` : '```';
  return `${fence}\n${text}\n\`\`\`\n`;
}

/**
 * 根据节点类型自动格式化内容
 */
export function autoFormatMarkdown(
  rawText: string,
  nodeType: string,
  depth?: number,
): string {
  switch (nodeType) {
    case 'heading': {
      const level = depth ?? 1;
      const prefix = '#'.repeat(Math.min(Math.max(level, 1), 6)) + ' ';
      return prefix + rawText + '\n';
    }
    case 'blockquote':
      return formatBlockquote(rawText, depth ?? 1);
    case 'listItem':
      return formatListItem(rawText, false, 1, depth ?? 0);
    case 'codeBlock':
      return formatCodeBlock(rawText);
    case 'paragraph':
    default:
      return ensureTrailingNewline(normalizeBlankLines(rawText));
  }
}
