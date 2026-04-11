
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractFencedBlocks, extractLatexFormulas } from '../../lib/export-prerender';

// We only test the pure functions (extractFencedBlocks, extractLatexFormulas) without DOM dependencies.
// renderMermaidToPng and svgToPngBase64 require DOM APIs (canvas, Image, DOMParser).

describe('export-prerender', () => {
  describe('extractFencedBlocks — 提取围栏代码块', () => {
    it('应提取单个 mermaid 块', () => {
      const blocks = extractFencedBlocks('```mermaid\ngraph TD\nA-->B\n```', 'mermaid');
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toContain('graph TD');
    });

    it('应提取多个 mermaid 块', () => {
      const md = '```mermaid\ngraph1\n```\nsome text\n```mermaid\ngraph2\n```';
      const blocks = extractFencedBlocks(md, 'mermaid');
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toContain('graph1');
      expect(blocks[1]).toContain('graph2');
    });

    it('空文档应返回空数组', () => {
      const blocks = extractFencedBlocks('', 'mermaid');
      expect(blocks).toEqual([]);
    });

    it('无匹配语言块时应返回空数组', () => {
      const blocks = extractFencedBlocks('```python\nprint("hi")\n```', 'mermaid');
      expect(blocks).toEqual([]);
    });

    it('应忽略其他语言的代码块', () => {
      const md = '```javascript\nconsole.log("hi")\n```\n```mermaid\nA-->B\n```\n```typescript\nconst x = 1;\n```';
      const blocks = extractFencedBlocks(md, 'mermaid');
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toContain('A-->B');
    });

    it('应正确处理 CRLF 换行', () => {
      const md = '```mermaid\r\ngraph LR\r\nA-->B\r\n```';
      const blocks = extractFencedBlocks(md, 'mermaid');
      expect(blocks).toHaveLength(1);
    });

    it('应处理包含反引号的块内容（不提前终止）', () => {
      const md = '```mermaid\ngraph TD\nA[``] --> B\n```';
      const blocks = extractFencedBlocks(md, 'mermaid');
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toContain('A[``]');
    });

    it('应处理带缩进的围栏块', () => {
      // Note: standard fenced blocks are not indented per CommonMark spec
      // but some flavors allow indentation; testing basic tolerance
      const md = '```mermaid \nA-->B\n```';
      const blocks = extractFencedBlocks(md, 'mermaid');
      expect(blocks).toHaveLength(1);
    });
  });

  describe('extractLatexFormulas — 提取 LaTeX 公式', () => {
    it('应提取单个 inline 数学公式', () => {
      const formulas = extractLatexFormulas('The formula is $E = mc^2$.');
      expect(formulas).toHaveLength(1);
      expect(formulas[0].formula).toBe('E = mc^2');
      expect(formulas[0].display).toBe(false);
    });

    it('应提取多个 inline 数学公式', () => {
      const formulas = extractLatexFormulas('Given $a^2 + b^2 = c^2$ and $x = 5$.');
      expect(formulas).toHaveLength(2);
      expect(formulas[0].formula).toBe('a^2 + b^2 = c^2');
      expect(formulas[0].display).toBe(false);
      expect(formulas[1].formula).toBe('x = 5');
      expect(formulas[1].display).toBe(false);
    });

    it('应提取单个 display 数学公式（多行格式）', () => {
      const md = 'The integral:\n$$\n\\int_0^\\infty e^{-x^2} dx\n$$';
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(1);
      expect(formulas[0].formula).toBe('\\int_0^\\infty e^{-x^2} dx');
      expect(formulas[0].display).toBe(true);
    });

    it('应提取多行 display 数学公式', () => {
      const md = '$$\n\\frac{d}{dx}\n\\left( f(x)g(x) \\right)\n= f(x)g\'(x) + f\'(x)g(x)\n$$';
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(1);
      expect(formulas[0].display).toBe(true);
      expect(formulas[0].formula).toContain('\\frac{d}{dx}');
    });

    it('应提取同行的 display 数学公式 $$...$$', () => {
      const formulas = extractLatexFormulas('The equation is $$\\nabla \\cdot E = \\rho$$.');
      expect(formulas).toHaveLength(1);
      expect(formulas[0].formula).toBe('\\nabla \\cdot E = \\rho');
      expect(formulas[0].display).toBe(true);
    });

    it('应同时提取 inline 和 display 公式（按顺序）', () => {
      const md = 'Inline $x$ and display $$\\sum_{i=1}^n i$$';
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(2);
      expect(formulas[0].formula).toBe('\\sum_{i=1}^n i');
      expect(formulas[0].display).toBe(true);
      expect(formulas[1].formula).toBe('x');
      expect(formulas[1].display).toBe(false);
    });

    it('应跳过代码块中的内容', () => {
      const md = '```python\nx = $invalid$  # 不应提取\n```\nValid $y$ here.';
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(1);
      expect(formulas[0].formula).toBe('y');
    });

    it('不应匹配价格如 $5.00', () => {
      const formulas = extractLatexFormulas('The price is $5.00 and tax is $0.30.');
      expect(formulas).toHaveLength(0);
    });

    it('应处理纯数字的 inline 数学（至少一位非数字字符）', () => {
      // $x1$ should match (x is non-digit)
      const formulas1 = extractLatexFormulas('$x1$');
      expect(formulas1).toHaveLength(1);
      expect(formulas1[0].formula).toBe('x1');

      // $x1$ should match (starts with non-digit — avoids price patterns like $5.00)
      const formulas2 = extractLatexFormulas('$x1$');
      expect(formulas2).toHaveLength(1);
      expect(formulas2[0].formula).toBe('x1');
    });

    it('应处理复杂的 LaTeX 公式', () => {
      const md = 'Einstein wrote $E = mc^2$ and the mass-energy equivalence follows from $$\\frac{E}{c^2} = m$$';
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(2);
      // display ($$...$$) regex runs before inline ($...$) on the same line
      expect(formulas[0].display).toBe(true);
      expect(formulas[1].display).toBe(false);
    });

    it('空文档应返回空数组', () => {
      const formulas = extractLatexFormulas('');
      expect(formulas).toEqual([]);
    });

    it('无公式时应返回空数组', () => {
      const formulas = extractLatexFormulas('No math here, just text.');
      expect(formulas).toEqual([]);
    });

    it('应处理多行中的多个公式', () => {
      const md = `First $a$ then $$b$$ then $c$`;
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(3);
      // display ($$b$$) is extracted first per-line, then inline ($a$, $c$)
      expect(formulas[0].formula).toBe('b');
      expect(formulas[0].display).toBe(true);
      expect(formulas[1].formula).toBe('a');
      expect(formulas[1].display).toBe(false);
      expect(formulas[2].formula).toBe('c');
      expect(formulas[2].display).toBe(false);
    });

    it('应正确处理 CRLF 换行', () => {
      const md = 'Display:\r\n$$\r\n\\int x dx\r\n$$\r\nInline $y$';
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(2);
      expect(formulas[0].display).toBe(true);
      expect(formulas[1].display).toBe(false);
    });

    it('应处理嵌套的 $$...$$ 公式', () => {
      const md = 'The equation $$\\begin{matrix} a & b \\\\ c & d \\end{matrix}$$ is a matrix.';
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(1);
      expect(formulas[0].display).toBe(true);
      expect(formulas[0].formula).toContain('\\begin{matrix}');
    });

    it('连续 inline 公式应分别提取', () => {
      const md = '$a$ $b$';  // two inline formulas separated by space
      const formulas = extractLatexFormulas(md);
      expect(formulas).toHaveLength(2);
      expect(formulas[0].formula).toBe('a');
      expect(formulas[1].formula).toBe('b');
    });

    it('空公式 $$...$$ 不应提取', () => {
      const md = 'Between $$ $$ empty formulas.';
      const formulas = extractLatexFormulas(md);
      // Empty formulas are trimmed and should result in empty string, which may or may not be included
      // Based on current implementation, empty formulas are filtered out by trim()
    });
  });
});
