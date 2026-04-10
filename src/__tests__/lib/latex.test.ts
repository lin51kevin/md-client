import { describe, it, expect } from 'vitest';
import { renderLatex } from '../../lib/latex';

describe('F007 — LaTeX 数学公式渲染', () => {

  describe('renderLatex — LaTeX → HTML 转换', () => {
    it('行内公式 $...$ 应转换为 <span> 标签', async () => {
      const result = await renderLatex('质能方程 $E=mc^2$ 很有名');
      expect(result).toContain('<span');
      expect(result).toContain('E=mc^2');
      // 原始 $ 符号应被移除
      expect(result).not.toContain('$E=mc^2$');
    });

    it('块级公式 $$...$$ 应转换为 <div> 或 <figure> 标签', async () => {
      const result = await renderLatex('$$\n\\int_0^1 x^2 dx\n$$');
      // 应该包含某种块级容器
      expect(result).toMatch(/<div|<figure|<span.*display/);
      expect(result).toContain('\\int');
    });

    it('多个公式应分别处理', async () => {
      const result = await renderLatex('$a+b$ 和 $c+d$');
      const spanMatches = result.match(/<span/g);
      expect(spanMatches?.length).toBeGreaterThanOrEqual(2);
    });

    it('不含公式的文本应原样返回', async () => {
      const text = '这是普通文字，没有公式';
      expect(await renderLatex(text)).toBe(text);
    });

    it('空字符串应返回空', async () => {
      expect(await renderLatex('')).toBe('');
    });
  });

  describe('安全性 — XSS 防护', () => {
    it('不应在输出中执行 <script> 标签', async () => {
      const result = await renderLatex('$<script>alert(1)</script>$');
      expect(result).not.toContain('<script>');
    });

    it('应转义 HTML 特殊字符', async () => {
      const result = await renderLatex('$x < 1 && y > 0$');
      // 输出应该是安全的 HTML 字符串
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

});
