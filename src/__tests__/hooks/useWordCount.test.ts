import { describe, it, expect } from 'vitest';
import { countWords, getReadingTime } from '../../lib/utils/word-count';

describe('useWordCount / word-count', () => {
  it('counts CJK characters as words', () => {
    const result = countWords('你好世界');
    expect(result.words).toBe(4);
  });

  it('counts English words', () => {
    const result = countWords('hello world');
    expect(result.words).toBe(2);
  });

  it('handles mixed CJK and English', () => {
    const result = countWords('你好 hello 世界');
    expect(result.words).toBe(5); // 4 CJK + 1 English
  });

  it('returns 0 for empty text', () => {
    const result = countWords('');
    expect(result.words).toBe(0);
  });

  it('strips markdown syntax', () => {
    const result = countWords('# Hello\n**world**');
    expect(result.words).toBe(2);
  });

  it('counts paragraphs', () => {
    const result = countWords('para1\n\npara2');
    expect(result.paragraphs).toBe(2);
  });
});

describe('getReadingTime', () => {
  it('returns < 1 min for small text', () => {
    expect(getReadingTime(10)).toBe('1 min');
  });

  it('returns 1 min for ~500 words', () => {
    expect(getReadingTime(500)).toBe('1 min');
  });

  it('returns minutes for larger text', () => {
    expect(getReadingTime(1200)).toBe('3 min');
  });
});
