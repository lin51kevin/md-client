import { describe, it, expect } from 'vitest';
import { getAutoCompletion } from './autocomplete';

/**
 * F001 — 自动补全功能测试
 * 
 * 测试场景：
 * 1. 输入 [ 后自动补全 ] 并将光标置于中间
 * 2. 输入 `` ` `` 后自动补全 `` ` `` （代码标记）
 * 3. 输入 **粗体语法** `**` 后自动补全 `**`
 * 4. 输入 *斜体语法* `*` 后自动补全 `*`
 * 5. 已有闭合符号时不重复补全
 */

describe('F001 — 自动补全', () => {

  describe('方括号补全', () => {
    it('输入 [ 后应补全 ]', () => {
      const result = getAutoCompletion('[', 1);
      expect(result).toEqual({ insertedText: ']', cursorOffset: 0 });
    });

    it('光标在 [ ] 中间时不再重复补全', () => {
      const result = getAutoCompletion('[]', 1);
      expect(result).toEqual({ insertedText: '', cursorOffset: 1 });
    });

    it('在已有文本后面输入 [ 应正常补全', () => {
      const result = getAutoCompletion('text [', 6);
      expect(result).toEqual({ insertedText: ']', cursorOffset: 0 });
    });
  });

  describe('圆括号补全', () => {
    it('输入 ( 后应补全 )', () => {
      const result = getAutoCompletion('(', 1);
      expect(result).toEqual({ insertedText: ')', cursorOffset: 0 });
    });
    
    it('链接场景：[text]( 后应补全 )', () => {
      const result = getAutoCompletion('[text](', 7);
      expect(result).toEqual({ insertedText: ')', cursorOffset: 0 });
    });
  });

  describe('花括号补全', () => {
    it('输入 { 后应补全 }', () => {
      const result = getAutoCompletion('{', 1);
      expect(result).toEqual({ insertedText: '}', cursorOffset: 0 });
    });
  });

  describe('代码反引号补全', () => {
    it('输入 ` 后应补全 `', () => {
      const result = getAutoCompletion('`', 1);
      expect(result).toEqual({ insertedText: '`', cursorOffset: 0 });
    });

    it('已有闭合 ` 时不重复补全', () => {
      const result = getAutoCompletion('``', 1);
      expect(result).toEqual({ insertedText: '', cursorOffset: 1 });
    });
  });

  describe('双引号/单引号补全', () => {
    it('输入 " 后应补全 "', () => {
      const result = getAutoCompletion('"', 1);
      expect(result).toEqual({ insertedText: '"', cursorOffset: 0 });
    });

    it("输入 ' 后应补全 '", () => {
      const result = getAutoCompletion("'", 1);
      expect(result).toEqual({ insertedText: "'", cursorOffset: 0 });
    });
  });

  describe('粗体/斜体补全', () => {
    it('输入 ** 后应补全 **', () => {
      const result = getAutoCompletion('**', 2);
      expect(result).toEqual({ insertedText: '**', cursorOffset: 0 });
    });

    it('已有 **** 时光标跳过', () => {
      const result = getAutoCompletion('****', 2);
      expect(result).toEqual({ insertedText: '', cursorOffset: 2 });
    });

    it('输入单个 * 后应补全 *', () => {
      const result = getAutoCompletion('*', 1);
      expect(result).toEqual({ insertedText: '*', cursorOffset: 0 });
    });

    it('* 在行首应补全（斜体）', () => {
      const result = getAutoCompletion('*hello*', 1);
      // 光标后是 h 不是 *，所以应该补全
      expect(result?.insertedText).toBe('*');
    });
  });

  describe('无需补全的情况', () => {
    it('普通文字输入不需要补全', () => {
      const result = getAutoCompletion('hello', 5);
      expect(result).toBeNull();
    });

    it('空行不需要补全', () => {
      const result = getAutoCompletion('', 0);
      expect(result).toBeNull();
    });

    it('数字不需要补全', () => {
      const result = getAutoCompletion('123', 3);
      expect(result).toBeNull();
    });

    it('光标位置为0不需要补全', () => {
      const result = getAutoCompletion('[', 0);
      expect(result).toBeNull();
    });
  });

});
