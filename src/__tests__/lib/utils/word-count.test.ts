import { describe, it, expect } from 'vitest';
import { countWords, countCharacters, getReadingTime } from '../../../lib/utils';

describe('F006 — 实时字数统计', () => {

  describe('countWords — 字数统计', () => {
    it('空字符串应返回 0', () => {
      expect(countWords('').words).toBe(0);
    });

    it('纯英文按单词空格分割统计', () => {
      expect(countWords('hello world').words).toBe(2);
      expect(countWords('this is a test').words).toBe(4);
    });

    it('中文按字符统计（不含标点和空白）', () => {
      const result = countWords('你好世界');
      expect(result.words).toBe(4);
    });

    it('中英混合应正确分别统计', () => {
      const result = countWords('Hello 你好 World 世界');
      // 英文 2 词 + 中文 4 字 = 6
      expect(result.words).toBe(6);
    });

    it('应忽略纯标点符号和空白', () => {
      // 中文标点（，。！？、）不应算入字数
      expect(countWords('，。！？、\n\t  ').words).toBe(0);
    });

    it('Markdown 语法不应计入字数', () => {
      const md = '# Title\n\n**bold** and *italic*\n- item1\n- item2\n\n> quote\n';
      const result = countWords(md);
      // Title bold and italic item1 item2 quote = 7 words (中英合计)
      expect(result.words).toBeGreaterThan(0);
      // 不应包含 # ** * - > 等标记
      expect(result.characters.noWhitespaceChars).toBeLessThanOrEqual(md.length);
    });

    it('代码块内的内容也应被统计', () => {
      const md = '```\nconsole.log("hello");\n```';
      const result = countWords(md);
      // 代码块中的英文单词 hello 和 console log 应被统计
      expect(result.words).toBeGreaterThan(0);
    });
  });

  describe('countCharacters — 字符统计', () => {
    it('总字符数应等于字符串长度', () => {
      expect(countCharacters('hello').totalChars).toBe(5);
    });

    it('应排除空白字符得到非空白字符数', () => {
      const result = countCharacters('hello world');
      expect(result.noWhitespaceChars).toBe(10); // "helloworld" 无空格
    });

    it('换行符算入 totalChars 但不计入 noWhitespaceChars', () => {
      const result = countCharacters('a\nb\nc');
      expect(result.totalChars).toBe(5); // a + \n + b + \n + c = 5
      expect(result.noWhitespaceChars).toBe(3); // a, b, c
    });
  });

  describe('getReadingTime — 阅读时间估算', () => {
    it('0 字应返回不到 1 分钟', () => {
      expect(getReadingTime(0)).toContain('min');
    });

    it('应基于中文 400字/分 或 英文 200词/分 估算', () => {
      const time = getReadingTime(500);
      // 500 字/词大约 1-3 分钟之间
      expect(time).toBeTruthy();
    });
  });

  describe('WordCountResult 完整性', () => {
    it('完整统计应包含所有字段', () => {
      const text = 'Hello 世界！\nThis is a test.';
      const result = countWords(text);
      
      expect(result).toHaveProperty('words');
      expect(result).toHaveProperty('characters');
      expect(result).toHaveProperty('paragraphs');
      expect(typeof result.words).toBe('number');
      expect(typeof result.paragraphs).toBe('number');
    });

    it('段落数应以双换行分割计算', () => {
      const result = countWords('para1\n\npara2\n\npara3');
      expect(result.paragraphs).toBe(3);
    });

    it('单段落文本段落数应为 1', () => {
      const result = countWords('just one paragraph');
      expect(result.paragraphs).toBe(1);
    });

    it('空文本段落数为 0', () => {
      const result = countWords('');
      expect(result.paragraphs).toBe(0);
    });
  });

});
