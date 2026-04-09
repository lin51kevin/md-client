/**
 * F014 — 右键上下文菜单检测
 *
 * 根据鼠标光标位置判断当前所在 Markdown 语法上下文，
 * 用于右键菜单显示不同的格式化选项。
 */

export type ContextType =
  | 'normal'     // 普通段落文本
  | 'heading'    // 标题行
  | 'code'       // 代码块内
  | 'table'      // 表格单元格内
  | 'listItem'   // 列表项
  | 'blockquote' // 引用块
  | 'math';      // 数学公式块

export interface ContextInfo {
  type: ContextType;
  /** 所在行的起始索引（在文档中） */
  lineStart: number;
  /** 所在行的内容 */
  lineText: string;
  /** 所在标题的级别（1-6），如果不是 heading 则为 0 */
  headingLevel: number;
}

/**
 * 根据文档文本和光标在文档中的位置，
 * 检测当前光标所在行的 Markdown 上下文类型。
 *
 * @param doc   完整文档文本
 * @param cursorPos 光标在文档中的字符索引
 * @returns ContextInfo 包含上下文类型和其他元信息
 */
export function detectContext(doc: string, cursorPos: number): ContextInfo {
  // 找到光标所在行的起始位置
  let lineStart = cursorPos;
  while (lineStart > 0 && doc[lineStart - 1] !== '\n') {
    lineStart--;
  }

  // 找到行结束位置
  let lineEnd = cursorPos;
  while (lineEnd < doc.length && doc[lineEnd] !== '\n') {
    lineEnd++;
  }

  const lineText = doc.substring(lineStart, lineEnd).trimStart();

  const type = detectContextType(lineText, 0);
  const headingLevel = type === 'heading'
    ? (lineText.match(/^(#{1,6})/)?.[1]?.length ?? 0)
    : 0;

  return { type, lineStart, lineText, headingLevel };
}

/**
 * 根据一行文本来判断其 Markdown 上下文类型
 *
 * @param text  行文本（已去除前导空格）
 * @param _cursorCol 光标在该行的列位置（预留参数）
 */
export function detectContextType(text: string, _cursorCol: number): ContextType {
  if (!text) return 'normal';

  // 标题行
  if (text.startsWith('#')) {
    return 'heading';
  }

  // 代码块（行内代码 `...`）
  if (/^`{3}/.test(text) || /`{3}$/.test(text)) {
    return 'code';
  }

  // 引用块
  if (text.startsWith('>')) {
    return 'blockquote';
  }

  // 列表项
  if (/^[-*+] /.test(text) || /^\d+\. /.test(text)) {
    return 'listItem';
  }

  // 表格行
  if (/^\|/.test(text) && /\|$/.test(text)) {
    return 'table';
  }

  // 数学公式块（行首 $$）
  if (text.startsWith('$$')) {
    return 'math';
  }

  return 'normal';
}
