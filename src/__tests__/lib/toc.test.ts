import { describe, it, expect } from 'vitest';
import { extractToc, slugify } from '../../lib/toc';

describe('F010 — 大纲导航 (TOC)', () => {

  describe('extractToc', () => {
    it('应提取各级 ATX 标题', () => {
      const md = `# 一级标题

## 二级标题

### 三级标题

#### 四级标题
`;
      const toc = extractToc(md);
      expect(toc).toHaveLength(4);
      expect(toc[0]).toEqual({ level: 1, text: '一级标题', position: 0, id: '一级标题' });
      expect(toc[1].level).toBe(2);
      expect(toc[2].level).toBe(3);
      expect(toc[3].level).toBe(4);
    });

    it('空文本应返回空数组', () => {
      expect(extractToc('')).toEqual([]);
    });

    it('无标题的文本应返回空数组', () => {
      expect(extractToc('只是一些\n普通文字\n没有标题')).toEqual([]);
    });

    it('应正确计算位置偏移', () => {
      const md = `hello world

# 标题
`;
      const toc = extractToc(md);
      expect(toc).toHaveLength(1);
      // "hello world\n\n" = 13 chars (11 + 1 + 1)
      expect(toc[0].position).toBe(13);
    });

    it('应处理带尾部 # 的标题', () => {
      const md = '# 带井号的标题 ###';
      const toc = extractToc(md);
      expect(toc).toHaveLength(1);
      expect(toc[0].text).toBe('带井号的标题');
    });

    it('应忽略围栏代码块内的 # 标记', () => {
      const md = `# 真实标题

\`\`\`markdown
# 这是代码块内的标题
## 也不应该出现
\`\`\`

## 真实二级标题
`;
      const toc = extractToc(md);
      expect(toc).toHaveLength(2);
      expect(toc[0].text).toBe('真实标题');
      expect(toc[1].text).toBe('真实二级标题');
    });

    it('应支持 ~~~ 风格的代码块过滤', () => {
      const md = `# 正常标题

~~~
# 不解析
~~~

## 另一个正常标题
`;
      const toc = extractToc(md);
      expect(toc).toHaveLength(2);
    });

    it('应处理多行混合内容', () => {
      const md = `# Introduction

Some paragraph here.

## Features

- Feature 1
- Feature 2

### Details

More content.
`;
      const toc = extractToc(md);
      expect(toc).toHaveLength(3);
      expect(toc[0].text).toBe('Introduction');
      expect(toc[1].text).toBe('Features');
      expect(toc[2].text).toBe('Details');
    });
  });

  describe('slugify', () => {
    it('应将空格替换为连字符', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('应去除特殊字符', () => {
      expect(slugify('Hello, World! (2024)')).toBe('hello-world-2024');
    });

    it('中文标题应保留汉字', () => {
      expect(slugify('第一章 开篇')).toBe('第一章-开篇');
    });

    it('空字符串应返回空', () => {
      expect(slugify('')).toBe('');
    });

    it('应处理连续特殊字符', () => {
      expect(slugify('a   b --- c')).toBe('a-b-c');
    });
  });
});
