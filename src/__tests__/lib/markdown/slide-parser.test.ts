import { describe, it, expect } from 'vitest';
import { parseSlides, extractSlideMetadata } from '../../../lib/markdown';

describe('slide-parser', () => {
  describe('parseSlides', () => {
    it('应分割三连字符 --- 作为幻灯片分页', () => {
      const md = '# Slide 1\n---\n## Slide 2';
      const slides = parseSlides(md);
      expect(slides).toHaveLength(2);
      expect(slides[0]).toContain('# Slide 1');
      expect(slides[1]).toContain('## Slide 2');
    });

    it('应处理垂直分页 +++', () => {
      const md = '# Parent\n+++\n# Child\n---\n# Next';
      const slides = parseSlides(md);
      // +++ is metadata for vertical stacking within same slide, not new slide
      expect(slides).toHaveLength(2);
      expect(slides[0]).toContain('# Parent');
      expect(slides[0]).toContain('# Child');
      expect(slides[1]).toContain('# Next');
    });

    it('应忽略开头和结尾的空幻灯片', () => {
      const md = '\n---\n# Only Slide\n---\n';
      const slides = parseSlides(md);
      expect(slides).toHaveLength(1);
      expect(slides[0]).toContain('# Only Slide');
    });

    it('应正确处理单个幻灯片（无分隔符）', () => {
      const md = '# Single Slide\nSome content';
      const slides = parseSlides(md);
      expect(slides).toHaveLength(1);
    });

    it('应处理多个连续分隔符', () => {
      const md = '# S1\n---\n---\n---\n# S2';
      const slides = parseSlides(md);
      expect(slides).toHaveLength(2);
    });

    it('应忽略 ~~~ 围栏代码块内的 ---', () => {
      const md = '# Slide 1\n~~~\n---\ncodeblock content\n~~~\n---\n# Slide 2';
      const slides = parseSlides(md);
      expect(slides).toHaveLength(2);
      expect(slides[0]).toContain('# Slide 1');
      expect(slides[0]).toContain('codeblock content');
      expect(slides[1]).toContain('# Slide 2');
    });

    it('应忽略 ``` 和 ~~~ 混合围栏内的 ---', () => {
      const md = '# Slide 1\n```\n---\n```\n~~~\n---\n~~~\n---\n# Slide 2';
      const slides = parseSlides(md);
      // Only the bare --- outside fences should split
      expect(slides).toHaveLength(2);
    });

    it('~~~ 围栏内的 --- 不应被误判为分隔符', () => {
      const md = '~~~yaml\nkey: value\n---\nother: val\n~~~';
      const slides = parseSlides(md);
      expect(slides).toHaveLength(1);
    });

    it('应保留幻灯片内容中的格式化文本', () => {
      const md = '```ts\nconst x = 1;\n```\n---\n**Bold text**';
      const slides = parseSlides(md);
      expect(slides).toHaveLength(2);
      expect(slides[0]).toContain('const x = 1');
      expect(slides[1]).toContain('**Bold text**');
    });
  });

  describe('extractSlideMetadata', () => {
    it('应提取标题（第一个 # 标题）', () => {
      const result = extractSlideMetadata('# Hello\n\nContent here');
      expect(result.title).toBe('Hello');
    });

    it('应提取背景色从注释中', () => {
      const result = extractSlideMetadata('<!-- .slide: data-background="#ff0" -->\n# Test');
      expect(result.background).toBe('#ff0');
    });

    it('应提取 transition 从特殊注释中', () => {
      const result = extractSlideMetadata('<!-- .slide: data-transition="zoom" -->\n# Test');
      expect(result.transition).toBe('zoom');
    });

    it('无元数据时返回空对象', () => {
      const result = extractSlideMetadata('Just content');
      expect(result.title).toBeUndefined();
      expect(result.background).toBeUndefined();
    });
  });
});
