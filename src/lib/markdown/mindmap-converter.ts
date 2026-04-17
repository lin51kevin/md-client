/**
 * P1-4 — 思维导图转换器
 *
 * 将 TocEntry[] 转换为 Mermaid mindmap 语法字符串。
 * 用于 MindmapView 组件渲染思维导图。
 */

import type { TocEntry } from './toc';

/**
 * 转义 Mermaid mindmap 语法中的保留字符。
 * 括号 `()` `[]` `{}` 在 Mermaid 中有特殊含义（节点形状），
 * 需要替换为全角字符以避免解析错误。
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\(/g, '（')
    .replace(/\)/g, '）')
    .replace(/\[/g, '［')
    .replace(/\]/g, '］')
    .replace(/\{/g, '｛')
    .replace(/\}/g, '｝');
}

/**
 * 将 TOC 条目数组转换为 Mermaid mindmap 语法。
 *
 * @param toc - 从 extractToc() 获取的标题条目
 * @param rootLabel - 根节点显示文本，默认 "Document"
 * @returns Mermaid mindmap 语法字符串
 *
 * @example
 * ```
 * tocToMindmap([
 *   { level: 1, text: '引言', position: 0, id: 'intro' },
 *   { level: 2, text: '背景', position: 20, id: 'bg' },
 * ])
 * // => "mindmap\n  root((Document))\n    引言\n      背景"
 * ```
 */
export function tocToMindmap(toc: TocEntry[], rootLabel = 'Document'): string {
  const lines: string[] = ['mindmap', `  root((${sanitizeText(rootLabel)}))`];

  if (toc.length === 0) return lines.join('\n');

  // Find the minimum heading level to normalize indentation
  const minLevel = Math.min(...toc.map(e => e.level));

  for (const entry of toc) {
    // Normalize: minLevel → depth 1  (indent = 2 + depth * 2 spaces)
    const depth = entry.level - minLevel + 1;
    const indent = '  '.repeat(depth + 1);
    lines.push(`${indent}${sanitizeText(entry.text)}`);
  }

  return lines.join('\n');
}
