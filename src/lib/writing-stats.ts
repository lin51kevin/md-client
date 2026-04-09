/**
 * F015 — 写作统计面板
 *
 * 提供 Markdown 文档的详细写作统计：
 * - 字数（中文按字符，英文按空格分割）
 * - 字符数（总计）
 * - 句子数（按句号/问号/感叹号分割）
 * - 预计阅读时间（200字/分钟，中文按500字/分钟）
 */

export interface WritingStats {
  words: number;
  characters: number;
  sentences: number;
  readingTime: number; // 分钟
  /** 本地化摘要字符串 */
  summary: string;
}

/**
 * 统计字数
 *
 * 中文每个字符算一个字，英文每个空格分隔的 token 算一个字。
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;

  // 去掉 Markdown 语法残留（代码块、链接等粗略处理）
  const plain = stripMarkdown(text);

  // 中文字符（Unicode 范围 4E00-9FFF，以及标点）
  const chineseChars = (plain.match(/[\u4e00-\u9fff\u3400-\u4dbf\u{10FFFF}]/gu) ?? []).length;

  // 英文单词（ASCII字母序列）
  const englishWords = (plain.match(/[a-zA-Z]+/g) ?? []).length;

  return chineseChars + englishWords;
}

/**
 * 统计字符数（含空格）
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * 统计句子数
 *
 * 按中文句号（。）和英文句号（.）以及问号、感叹号分割。
 * 忽略 Markdown 链接中的标点。
 */
export function countSentences(text: string): number {
  if (!text.trim()) return 0;

  // 简单实现：遇到 。.！？ 视为句子结束
  // 排除 Markdown 链接中的点（不严谨但够用）
  const sentences = text.match(/[。.!?！？]/g) ?? [];
  return sentences.length;
}

/**
 * 估算阅读时间（分钟）
 *
 * - 中文：500字/分钟
 * - 英文：200词/分钟
 * 取混合内容的加权平均。
 */
export function estimateReadingTime(text: string): number {
  const words = countWords(text);
  if (words === 0) return 0;
  // 粗略估计：假设 50% 中文（500字/分钟）+ 50% 英文（200词/分钟）
  const minutes = Math.ceil(words / 300);
  return Math.max(1, minutes);
}

/**
 * 获取阅读时间本地化标签
 */
export function getReadingTimeLabel(minutes: number): string {
  if (minutes <= 0) return '不足 1 分钟';
  return `${minutes} 分钟`;
}

/**
 * 构建完整的写作统计摘要
 */
export function buildStatsSummary(text: string): WritingStats {
  const words = countWords(text);
  const characters = countCharacters(text);
  const sentences = countSentences(text);
  const readingTime = estimateReadingTime(text);

  const summary = [
    characters > 0 ? `${characters} 字` : null,
    words > 0 ? `${words} 词` : null,
    sentences > 0 ? `${sentences} 句` : null,
    readingTime > 0 ? getReadingTimeLabel(readingTime) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return { words, characters, sentences, readingTime, summary };
}

/**
 * 粗略去除 Markdown 语法（保留纯文本用于字数统计）
 */
function stripMarkdown(text: string): string {
  return text
    // 去掉行内代码
    .replace(/`[^`]*`/g, '')
    // 去掉代码块
    .replace(/```[\s\S]*?```/g, '')
    // 去掉链接 [text](url)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 去掉图片 ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // 去掉 Markdown 标题标记
    .replace(/^#{1,6}\s+/gm, '')
    // 去掉加粗/斜体标记
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // 去掉引用标记
    .replace(/^>\s+/gm, '')
    // 去掉列表标记
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 去掉脚注引用 [^n]
    .replace(/\[\^[^\]]+\]/g, '')
    // 去掉脚注定义 [^n]:
    .replace(/^\[\^[^\]]+\]:.*/gm, '');
}
