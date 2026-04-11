import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractFencedBlocks } from '../../lib/export-prerender';

// We only test the pure functions (extractFencedBlocks) without DOM dependencies.
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
});
