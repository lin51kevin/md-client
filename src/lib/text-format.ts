/**
 * F014 — 文本格式化工具函数
 *
 * 提供对 Markdown 文本的通用格式化操作：
 * - wrapSelection: 包装选中文本（加粗/斜体/删除线）
 * - toggleLinePrefix: 切换行级前缀（标题）
 * - insertLink: 插入链接
 * - insertImage: 插入图片
 *
 * 这些函数返回 { replacement, newCursorOffset }，
 * 由 CodeMirror Hook 在编辑器中实际执行。
 */

/** 选区信息 */
export interface SelectionInfo {
  text: string;
  start: number;
  end: number;
}

/** 格式化操作结果 */
export interface FormatResult {
  /** 要替换的文本（空字符串表示不替换） */
  replacement: string;
  /** 光标相对位移（基于 replacement 的起始位置） */
  newCursorOffset: number;
}

/**
 * 用指定符号包装选中文本
 *
 * @param sel      当前选区
 * @param wrapper 包装符号，如 **（加粗）、*（斜体）、~~（删除线）、`（行内代码）
 * @returns 替换结果与新光标位置
 */
export function wrapSelection(sel: SelectionInfo, wrapper: string): FormatResult {
  const { text, start, end } = sel;
  const selected = text.substring(start, end);

  // Toggle 检测：选区内容恰好被 wrapper 包裹 → 去除包装
  if (
    selected.startsWith(wrapper) &&
    selected.endsWith(wrapper) &&
    selected.length > wrapper.length * 2
  ) {
    const inner = selected.slice(wrapper.length, selected.length - wrapper.length);
    return {
      replacement: inner,
      newCursorOffset: 0,
    };
  }

  // 有选区：wrapper + 选中文本 + wrapper，光标在开头 wrapper 之后
  if (selected.length > 0) {
    const newText = wrapper + selected + wrapper;
    return {
      replacement: newText,
      newCursorOffset: wrapper.length,
    };
  }

  // 空选区：插入 wrapper + wrapper，光标置于中间
  return {
    replacement: wrapper + wrapper,
    newCursorOffset: wrapper.length,
  };
}

/**
 * 切换行级前缀（用于标题等）
 *
 * @param text      完整文档文本
 * @param lineStart 光标所在行的起始位置（在 text 中的索引）
 * @param prefix   单个字符如 "#", "-", ">"
 */
export function toggleLinePrefix(
  text: string,
  lineStart: number,
  prefix: string,
): FormatResult {
  const lineEnd = text.indexOf('\n', lineStart);
  const lineText = lineEnd === -1
    ? text.substring(lineStart)
    : text.substring(lineStart, lineEnd);

  // 检查当前标题前缀（如 "## "）
  const headingMatch = lineText.match(/^(#{1,6} )/);
  const currentPrefix = headingMatch?.[1] ?? '';

  if (currentPrefix) {
    // 有标题前缀 → 升级（如 "## " → "### "），到达 h6 后移除
    const currentLevel = currentPrefix.length - 1; // "# " 长度为 2，第一个 # 的索引是 0
    if (currentLevel >= 6) {
      // h6 → 移除标题前缀
      return {
        replacement: text.substring(0, lineStart) + lineText.substring(currentPrefix.length),
        newCursorOffset: 0,
      };
    }
    // 升级到下一个标题级别
    const nextLevel = currentLevel + 1;
    const nextPrefix = '#'.repeat(nextLevel) + ' ';
    return {
      replacement: text.substring(0, lineStart) + nextPrefix + lineText.substring(currentPrefix.length),
      newCursorOffset: nextPrefix.length,
    };
  }

  // 无前缀 → 添加标题前缀
  const prefixWithSpace = prefix.endsWith(' ') ? prefix : prefix + ' ';
  return {
    replacement: text.substring(0, lineStart) + prefixWithSpace + lineText,
    newCursorOffset: prefixWithSpace.length,
  };
}

/**
 * 插入 Markdown 链接
 *
 * @param sel   当前选区（用于获取链接文字）
 * @param href  链接地址
 */
export function insertLink(sel: SelectionInfo, href: string): FormatResult {
  const label = sel.text.substring(sel.start, sel.end);
  const linkText = label.length > 0 ? `[${label}](${href})` : `[](${href})`;
  return {
    replacement: linkText,
    newCursorOffset: label.length > 0 ? linkText.length : 1,
  };
}

/**
 * 插入 Markdown 图片
 *
 * @param sel  当前选区（用于获取 alt 文字）
 * @param src  图片路径
 */
export function insertImage(sel: SelectionInfo, src: string): FormatResult {
  const alt = sel.text.substring(sel.start, sel.end);
  const md = alt.length > 0 ? `![${alt}](${src})` : `![](${src})`;
  return {
    replacement: md,
    newCursorOffset: alt.length > 0 ? md.length : 1,
  };
}
