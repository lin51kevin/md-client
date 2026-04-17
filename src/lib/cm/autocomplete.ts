/**
 * F001 — Markdown 自动补全
 * 
 * 处理成对符号的自动闭合：
 * - 括号类：[] () {} 
 * - 引号类："" '' ``
 * - Markdown语法：**（粗体） *（斜体）
 */

export interface CompletionResult {
  /** 需要插入的文本 */
  insertedText: string;
  /** 光标相对移动量（正=右移跳过，负=左移） */
  cursorOffset: number;
}

/**
 * 根据当前行内容和光标位置，判断是否需要自动补全
 * 
 * @param line - 当前行文本
 * @param cursorPos - 光标位置（从0开始，指向字符间隙）
 * @returns 不需要补全时返回 null
 */
export function getAutoCompletion(line: string, cursorPos: number): CompletionResult | null {
  if (cursorPos === 0) return null;

  const charBefore = line[cursorPos - 1];
  const charAfter = line[cursorPos];

  // ===== 特殊处理：* 和 **（必须在普通 pairs 之前） =====
  if (charBefore === '*') {
    // ** 粗体
    if (cursorPos >= 2 && line[cursorPos - 2] === '*') {
      if (line.slice(cursorPos, cursorPos + 2) === '**') {
        return { insertedText: '', cursorOffset: 2 };
      }
      return { insertedText: '**', cursorOffset: 0 };
    }
    // * 斜体
    if (charAfter === '*') {
      return { insertedText: '', cursorOffset: 1 };
    }
    return { insertedText: '*', cursorOffset: 0 };
  }

  // ===== 普通成对符号 =====
  const pairs: Record<string, string> = {
    '[': ']',
    '(': ')',
    '{': '}',
    '`': '`',
    '"': '"',
    "'": "'",
  };

  if (charBefore && pairs[charBefore]) {
    const closeChar = pairs[charBefore];
    
    // 光标后已有闭合符 → 跳过
    if (charAfter === closeChar) {
      return { insertedText: '', cursorOffset: 1 };
    }
    
    return { insertedText: closeChar, cursorOffset: 0 };
  }

  return null;
}
