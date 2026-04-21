/**
 * text-stats — unified text statistics module.
 *
 * Combines word counting, character stats, paragraph/sentence counting,
 * and reading time estimation for Markdown documents.
 * Supports Chinese/English mixed content.
 */

/** 中文字符匹配（汉字） */
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/g;

/** 英文单词匹配 */
const WORD_RE = /[a-zA-Z0-9]+/g;

/** 段落分割（一个或多个空行） */
const PARAGRAPH_SPLIT = /\n\s*\n/;

/** 纯标点符号 */
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

export interface WritingStats {
  words: number;
  characters: number;
  sentences: number;
  readingTime: number;
  summary: string;
}

/**
 * 统计文本字数（中文按字、英文按词）
 */
export function countWords(text: string): WordCountResult {
  if (!text.trim()) {
    return { words: 0, characters: countCharacters(text), paragraphs: 0 };
  }

  const stripped = stripMarkdown(text).replace(PUNCTUATION_RE, '');

  let wordCount = 0;

  const cjkMatches = stripped.match(CJK_RE);
  if (cjkMatches) wordCount += cjkMatches.length;

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
 * 计算段落数（以空行分隔）
 */
export function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  return text.split(PARAGRAPH_SPLIT).filter(p => p.trim()).length;
}

/**
 * 统计句子数
 */
export function countSentences(text: string): number {
  if (!text.trim()) return 0;
  const sentences = text.match(/[。.!?！？]/g) ?? [];
  return sentences.length;
}

/**
 * 估算阅读时间（格式化字符串）
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
 * 估算阅读时间（数值，分钟）
 * 混合内容约 350 字词/分钟
 */
export function estimateReadingTime(text: string): number {
  const { words } = countWords(text);
  if (words === 0) return 0;
  return Math.max(1, Math.ceil(words / 350));
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
  const { words } = countWords(text);
  const characters = text.length;
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
 * 剥离 Markdown 语法标记，保留纯文本用于统计
 */
function stripMarkdown(text: string): string {
  return text
    // 去掉 YAML frontmatter
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    // 去掉代码块
    .replace(/```[\s\S]*?```/g, '')
    // 去掉行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 移除标题标记
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗体/斜体
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // 移除链接，保留文本
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 移除图片，保留 alt
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // 移除无序列表标记
    .replace(/^[-*+]\s+/gm, '')
    // 移除有序列表标记
    .replace(/^\d+\.\s+/gm, '')
    // 移除引用标记
    .replace(/^>\s+/gm, '')
    // 移除分隔线
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // 移除表格分隔线
    .replace(/^\|?[\s\-:]+\|?\s*$/gm, '')
    // 移除表格管道符
    .replace(/\|/g, ' ')
    // 去掉脚注引用
    .replace(/\[\^[^\]]+\]/g, '')
    // 去掉脚注定义
    .replace(/^\[\^[^\]]+\]:.*/gm, '');
}
