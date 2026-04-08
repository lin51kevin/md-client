import { describe, it, expect } from 'vitest';
import { searchAll, replaceAll, replaceNext } from './search';

/**
 * F002 — 搜索替换功能测试
 * 
 * 测试场景：
 * 1. 基本文本搜索（大小写敏感/不敏感）
 * 2. 正则表达式搜索
 * 3. 替换功能（单个/全部替换）
 * 4. 搜索结果高亮位置计算
 */

describe('F002 — 搜索功能', () => {

  describe('基本搜索', () => {
    it('能找到简单文本', () => {
      const results = searchAll('hello world hello', 'hello');
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ from: 0, to: 5, match: 'hello' });
      expect(results[1]).toEqual({ from: 12, to: 17, match: 'hello' });
    });

    it('空查询返回空结果', () => {
      expect(searchAll('hello', '')).toEqual([]);
    });

    it('无匹配返回空结果', () => {
      expect(searchAll('hello', 'xyz')).toEqual([]);
    });

    it('搜索单字符', () => {
      const results = searchAll('a b c d a', 'a');
      expect(results).toHaveLength(2);
    });
  });

  describe('大小写敏感性', () => {
    it('默认不区分大小写', () => {
      const results = searchAll('Hello HELLO hello', 'hello');
      expect(results).toHaveLength(3);
    });

    it('区分大小写模式', () => {
      const results = searchAll('Hello HELLO hello', 'hello', { caseSensitive: true });
      expect(results).toHaveLength(1);
      expect(results[0].from).toBe(12);
    });
  });

  describe('正则搜索', () => {
    it('支持正则表达式', () => {
      const results = searchAll('abc123 def456 ghi789', '\\d+', { regex: true });
      expect(results).toHaveLength(3);
      expect(results[0].match).toBe('123');
    });

    it('无效正则返回空结果', () => {
      const results = searchAll('hello', '[invalid', { regex: true });
      expect(results).toEqual([]);
    });
  });

  describe('特殊字符转义', () => {
    it('自动转义正则特殊字符（非正则模式）', () => {
      const results = searchAll('price: $100 (tax)', '$100');
      expect(results).toHaveLength(1);
      expect(results[0].match).toBe('$100');
    });

    it('搜索包含 . 的文本', () => {
      const results = searchAll('file.txt and file.txt', 'file.txt');
      expect(results).toHaveLength(2);
    });
  });

});


describe('F002 — 替换功能', () => {

  describe('全部替换', () => {
    it('替换所有匹配项', () => {
      expect(replaceAll('hello world hello', 'hello', 'hi'))
        .toBe('hi world hi');
    });

    it('空查询返回原文', () => {
      expect(replaceAll('hello', '', 'hi')).toBe('hello');
    });

    it('支持大小写不敏感替换', () => {
      expect(replaceAll('Hello HELLO', 'hello', 'hi'))
        .toBe('hi hi');
    });
  });

  describe('正则替换', () => {
    it('支持正则替换', () => {
      expect(replaceAll('abc123 def456', '\\d+', 'NUM', { regex: true }))
        .toBe('abcNUM defNUM');
    });
  });

  describe('单次替换', () => {
    it('从指定位置开始替换下一个', () => {
      const result = replaceNext('aaa', 'a', 'b', 1);
      expect(result).not.toBeNull();
      expect(result?.newText).toBe('aba');
    });

    it('无匹配返回 null', () => {
      expect(replaceNext('hello', 'x', 'y')).toBeNull();
    });

    it('循环回到开头', () => {
      const result = replaceNext('ab ab', 'b', 'X', 10);
      expect(result).not.toBeNull();
      expect(result?.replacedFrom).toBe(1);
    });
  });

});
