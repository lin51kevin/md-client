/**
 * F006 — 实时字数统计
 *
 * 纯函数：对 Markdown 文本进行字数/字符/段落统计。
 * 支持中英文混合文本。
 */

/** 中文字符匹配（仅汉字，不含 CJK 标点符号） */
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/g;

/** 英文单词匹配（连续字母数字） */
const WORD_RE = /[a-zA-Z0-9]+/g;

/** 段落分割（一个或多个空行） */
const PARAGRAPH_SPLIT = /\n\s*\n/;

/** 纯标点符号（中英文标点/符号，从字数统计中排除） */
const PUNCTUATION_RE = /[\u3000-\u303f\uff00-\uffef\u2000-\u206f\u00a0\u00b7\u2013-\u2023\u2028\u2029.,;:!?'"()\[\]{}<>/\\@#$%^&*~`=+|-]/g;

export interface WordCountResult {
  /** 字数（中文按字、英文按词计算） */
  words: number;
  /** 字符详情 */
  characters: CharacterCount;
  /** 段落数 */
  paragraphs: number;
}

export interface CharacterCount {
  /** 总字符数（含空白） */
  totalChars: number;
  /** 非空白字符数 */
  noWhitespaceChars: number;
}

/**
 * 统计文本字数
 *
 * - 中文每个汉字算 1 字
 * - 英文按空格分词算
 * - 排除纯 Markdown 标记符号(# ** * - > | 等)
 * - 排除纯标点符号
 */
export function countWords(text: string): WordCountResult {
  if (!text.trim()) {
    return { words: 0, characters: countCharacters(text), paragraphs: 0 };
  }

  // 剥离 Markdown 标记 → 排除纯标点 → 再统计
  const stripped = stripMarkdown(text).replace(PUNCTUATION_RE, '');

  let wordCount = 0;

  // 中文字符：每个算 1 字
  const cjkMatches = stripped.match(CJK_RE);
  if (cjkMatches) wordCount += cjkMatches.length;

  // 英文单词
  const wordMatches = stripped.match(WORD_RE);
  if (wordMatches) wordCount += wordMatches.length;

  return {
    words: wordCount,
    characters: countCharacters(text),
    paragraphs: countParagraphs(text),
  };
}

/**
 * 统计字符数
 */
export function countCharacters(text: string): CharacterCount {
  return {
    totalChars: text.length,
    noWhitespaceChars: text.replace(/\s/g, '').length,
  };
}

/**
 * 估算阅读时间
 *
 * 中英文混合保守估计约 500 字词/分钟
 */
export function getReadingTime(wordCount: number): string {
  if (wordCount <= 0) return '< 1 min';

  const minutes = Math.ceil(wordCount / 500);

  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

/**
 * 计算段落数（以空行分隔）
 */
function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  const paras = text.split(PARAGRAPH_SPLIT).filter(p => p.trim());
  return paras.length;
}

/**
 * 剥离 Markdown 语法标记，保留纯文本用于字数统计
 *
 * 注意策略：
 * - 行内代码：去掉反引号，保留内容（如 `code` → code）
 * - 代码块：去掉 ``` 包裹符，保留内容
 * - 链接/图片：保留显示文本
 * - 列表/引用/标题标记：移除
 */
function stripMarkdown(text: string): string {
  return text
    // 移除标题标记 # ##
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗体/斜体
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // 行内代码：去掉反引号保留内容
    .replace(/`([^`]+)`/g, '$1')
    // 代码块：去掉 ``` 包裹保留内容
    .replace(/^```\s*/gm, '').replace(/\s*```$/gm, '')
    // 移除链接语法，保留文本
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除图片，保留 alt 文本
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // 移除无序列表标记
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // 移除有序列表标记
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 移除引用标记 >
    .replace(/^>\s+/gm, '')
    // 移除分隔线
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // 移除表格分隔线
    .replace(/^\|?[\s\-:]+\|?\s*$/gm, '')
    // 移除表格单元格的 | 包裹
    .replace(/\|/g, ' ');
}
