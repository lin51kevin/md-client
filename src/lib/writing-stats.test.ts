import { describe, it, expect } from 'vitest';
import {
  countWords,
  countCharacters,
  countSentences,
  estimateReadingTime,
  getReadingTimeLabel,
  buildStatsSummary,
  type WritingStats,
} from './writing-stats';

describe('writing-stats: countWords', () => {
  it('counts Chinese characters correctly', () => {
    expect(countWords('你好世界')).toBe(4);
  });

  it('counts English words correctly', () => {
    expect(countWords('Hello world')).toBe(2);
  });

  it('counts mixed Chinese and English', () => {
    expect(countWords('你好Hello世界world')).toBe(6); // 4 Chinese + 2 English words
  });

  it('ignores excessive whitespace', () => {
    expect(countWords('hello    world')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });
});

describe('writing-stats: countCharacters', () => {
  it('counts all characters including spaces', () => {
    expect(countCharacters('hello world')).toBe(11);
  });

  it('counts Chinese characters', () => {
    expect(countCharacters('你好')).toBe(2);
  });
});

describe('writing-stats: countSentences', () => {
  it('counts sentences ending with Chinese full stop', () => {
    expect(countSentences('第一句。第二句。第三句。')).toBe(3);
  });

  it('counts sentences ending with English period', () => {
    expect(countSentences('First sentence. Second sentence.')).toBe(2);
  });

  it('counts sentences ending with question marks', () => {
    expect(countSentences('你好吗？我很好。')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(countSentences('')).toBe(0);
  });
});

describe('writing-stats: estimateReadingTime', () => {
  it('returns 1 minute minimum for any content', () => {
    expect(estimateReadingTime('hello')).toBe(1);
  });

  it('scales with word count (200 WPM)', () => {
    // 200 words ≈ 1 minute
    const words = Array(200).fill('word').join(' ');
    expect(estimateReadingTime(words)).toBe(1);

    // 400 words ≈ 2 minutes
    const words400 = Array(400).fill('word').join(' ');
    expect(estimateReadingTime(words400)).toBe(2);
  });
});

describe('writing-stats: getReadingTimeLabel', () => {
  it('returns 分钟 label for Chinese text', () => {
    expect(getReadingTimeLabel(3)).toBe('3 分钟');
    expect(getReadingTimeLabel(1)).toBe('1 分钟');
  });
});

describe('writing-stats: buildStatsSummary', () => {
  it('returns complete WritingStats for mixed content', () => {
    const md = '这是中文段落。有两个句子。Hello world. Another sentence.';
    const stats = buildStatsSummary(md);
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.characters).toBeGreaterThan(0);
    expect(stats.sentences).toBeGreaterThan(0);
    expect(stats.readingTime).toBeGreaterThan(0);
    expect(stats.summary).toContain('字');
    expect(stats.summary).toContain('句');
  });

  it('returns zero stats for empty content', () => {
    const stats = buildStatsSummary('');
    expect(stats.words).toBe(0);
    expect(stats.sentences).toBe(0);
  });
});
