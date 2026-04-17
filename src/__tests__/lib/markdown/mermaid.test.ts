import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mermaid module
const mockRender = vi.fn().mockResolvedValue({ svg: '<svg><path d="M0 0"/></svg>' });
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: mockRender,
  },
}));

import { renderMermaid } from '../../../lib/markdown';
import { resetMermaidInit } from '../../../lib/markdown';

describe('F008 — Mermaid 图表渲染', () => {

  beforeEach(() => {
    // 每次测试前重置初始化状态
    resetMermaidInit?.();
    mockRender.mockClear();
  });

  describe('renderMermaid — Mermaid → SVG', () => {
    it('流程图应调用 mermaid.render 并返回 SVG', async () => {
      const md = `\`\`\`mermaid\ngraph TD\n    A --> B\n\`\`\``;
      const result = await renderMermaid(md);
      expect(mockRender).toHaveBeenCalled();
      expect(result).toContain('<svg');
      expect(result).toContain('<path');
    });

    it('时序图应成功渲染', async () => {
      const md = `\`\`\`mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n\`\`\``;
      const result = await renderMermaid(md);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('应支持 CRLF (\\r\\n) 换行符（Windows 兼容性）', async () => {
      const md = `\`\`\`mermaid\r\ngraph LR\r\n    A-->B\r\n\`\`\``;
      const result = await renderMermaid(md);
      expect(mockRender).toHaveBeenCalled();
      expect(result).toContain('<svg');
    });

    it('多个代码块应分别处理', async () => {
      const md = `\`\`\`mermaid\ngraph LR\n    A-->B\n\`\`\`\n\nSome text\n\n\`\`\`mermaid\npie\n    title Test\n    "A" : 1\n\`\`\``;
      const result = await renderMermaid(md);
      expect(result).toContain('<svg');
      expect(mockRender).toHaveBeenCalledTimes(2);
    });

    it('不含 mermaid 的文本应原样返回', async () => {
      const text = '这是普通文字\\n\`\`\`js\\nconsole.log("hi");\\n\`\`\`';
      expect(await renderMermaid(text)).toBe(text);
    });

    it('空字符串应返回空', async () => {
      expect(await renderMermaid('')).toBe('');
    });

    it('渲染失败时应返回错误提示而非崩溃', async () => {
      mockRender.mockRejectedValueOnce(new Error('Syntax error'));
      const md = `\`\`\`mermaid\ninvalid syntax here!!!\n\`\`\``;
      const result = await renderMermaid(md);
      expect(result).toContain('mermaid-error');
      expect(result).not.toContain('<svg');
    });
  });
});
