import { describe, it, expect } from 'vitest';
import {
  countWords,
  countCharacters,
  getReadingTime,
  countSentences,
  estimateReadingTime,
  getReadingTimeLabel,
  buildStatsSummary,
  countParagraphs,
  type WordCountResult,
  type CharacterCount,
  type WritingStats,
} from '../../../lib/utils/text-stats';

describe('text-stats: unified text statistics module', () => {
  describe('countWords', () => {
    it('empty string → 0', () => {
      expect(countWords('').words).toBe(0);
    });

    it('pure Chinese → character count', () => {
      expect(countWords('你好世界').words).toBe(4);
    });

    it('pure English → word count', () => {
      expect(countWords('hello world').words).toBe(2);
    });

    it('mixed Chinese/English → sum', () => {
      expect(countWords('Hello 你好 World 世界').words).toBe(6);
    });

    it('Markdown syntax is stripped', () => {
      expect(countWords('# Title\n**bold** text').words).toBeGreaterThan(0);
    });

    it('YAML frontmatter is stripped', () => {
      const doc = '---\ntitle: Test\n---\nHello world';
      expect(countWords(doc).words).toBe(2);
    });

    it('returns WordCountResult with characters and paragraphs', () => {
      const result: WordCountResult = countWords('Hello world');
      expect(result).toHaveProperty('words');
      expect(result).toHaveProperty('characters');
      expect(result).toHaveProperty('paragraphs');
    });
  });

  describe('countCharacters', () => {
    it('returns total and noWhitespace counts', () => {
      const result: CharacterCount = countCharacters('a b c');
      expect(result.totalChars).toBe(5);
      expect(result.noWhitespaceChars).toBe(3);
    });
  });

  describe('countParagraphs', () => {
    it('empty → 0', () => {
      expect(countParagraphs('')).toBe(0);
    });

    it('counts by empty-line separation', () => {
      expect(countParagraphs('para1\n\npara2\n\npara3')).toBe(3);
    });

    it('single paragraph without empty lines → 1', () => {
      expect(countParagraphs('one line')).toBe(1);
    });
  });

  describe('countSentences', () => {
    it('counts sentence terminators', () => {
      expect(countSentences('Hello. World! How?')).toBe(3);
    });

    it('counts Chinese sentence terminators', () => {
      expect(countSentences('你好。世界！如何？')).toBe(3);
    });

    it('empty → 0', () => {
      expect(countSentences('')).toBe(0);
    });
  });

  describe('getReadingTime', () => {
    it('0 words → "< 1 min"', () => {
      expect(getReadingTime(0)).toBe('< 1 min');
    });

    it('small count → "1 min"', () => {
      expect(getReadingTime(100)).toBe('1 min');
    });

    it('large count → "N min"', () => {
      expect(getReadingTime(2500)).toBe('5 min');
    });
  });

  describe('estimateReadingTime', () => {
    it('empty text → 0', () => {
      expect(estimateReadingTime('')).toBe(0);
    });

    it('returns positive minutes for content', () => {
      expect(estimateReadingTime('Hello '.repeat(500))).toBeGreaterThan(0);
    });
  });

  describe('getReadingTimeLabel', () => {
    it('returns localized label', () => {
      expect(getReadingTimeLabel(0)).toContain('1');
      expect(getReadingTimeLabel(5)).toContain('5');
    });
  });

  describe('buildStatsSummary', () => {
    it('returns WritingStats object', () => {
      const stats: WritingStats = buildStatsSummary('Hello world. Goodbye.');
      expect(stats.words).toBeGreaterThan(0);
      expect(stats.characters).toBeGreaterThan(0);
      expect(stats.sentences).toBeGreaterThan(0);
      expect(stats.readingTime).toBeGreaterThanOrEqual(0);
      expect(stats.summary).toBeTruthy();
    });
  });
});
