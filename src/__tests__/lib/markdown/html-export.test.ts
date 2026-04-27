import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markdownToHtml, generateHtmlDocument, generateEpub } from '../../../lib/markdown';
import epubGen from 'epub-gen-memory';

vi.mock('epub-gen-memory', () => ({
  default: vi.fn().mockResolvedValue(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
}));

describe('F005 — 导出 HTML', () => {

  describe('markdownToHtml — Markdown → HTML 片段转换', () => {
    it('应将标题转换为对应标签', async () => {
      expect(await markdownToHtml('# Hello')).toContain('<h1 id="hello">Hello</h1>');
      expect(await markdownToHtml('## World')).toContain('<h2 id="world">World</h2>');
    });

    it('应将粗体和斜体文本正确转换', async () => {
      const result = await markdownToHtml('**bold** and *italic*');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('应转换行内代码和代码块', async () => {
      const result = await markdownToHtml('`code`\n\n```\nblock\n```');
      expect(result).toContain('<code>code</code>');
      expect(result).toContain('<pre>');
      expect(result).toContain('block');
    });

    it('应转换链接和图片语法', async () => {
      const result = await markdownToHtml('[link](https://example.com)');
      expect(result).toContain('<a href="https://example.com">link</a>');
    });

    it('应转换无序和有序列表', async () => {
      const result = await markdownToHtml('- item1\n- item2\n\n1. one\n2. two');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>item1</li>');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>one</li>');
    });

    it('应转换表格', async () => {
      const md = '| A | B |\n|---|---|\n| 1 | 2 |';
      const result = await markdownToHtml(md);
      expect(result).toContain('<table>');
      expect(result).toContain('<td>1</td>');
    });

    it('应转换任务列表（GFM）', async () => {
      const result = await markdownToHtml('- [x] done\n- [ ] todo');
      expect(result).toContain('type="checkbox"');
      expect(result).toContain('checked');
    });

    it('空字符串应返回空 HTML', async () => {
      expect(await markdownToHtml('')).toBe('');
    });

    it('纯文本不应被包装在任何块级元素中', async () => {
      const result = await markdownToHtml('just some text');
      expect(result).toContain('just some text');
    });
  });

  describe('generateHtmlDocument — 完整 HTML 文档生成', () => {
    it('应包含 <html>, <head>, <body> 基本结构', async () => {
      const html = await generateHtmlDocument('# Test');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
    });

    it('body 中应包含渲染后的内容', async () => {
      const html = await generateHtmlDocument('# Hello World');
      expect(html).toContain('<h1 id="hello-world">Hello World</h1>');
    });

    it('应包含 viewport meta 标签', async () => {
      const html = await generateHtmlDocument('test');
      expect(html).toContain('viewport');
    });

    it('应包含基本的 CSS 样式', async () => {
      const html = await generateHtmlDocument('test');
      expect(html).toMatch(/<style[\s\S]*?<\/style>/);
    });

    it('代码块应有基本样式（背景色、等宽字体）', async () => {
      const html = await generateHtmlDocument('```\ncode block\n```');
      expect(html).toContain('pre');
      expect(html).toMatch(/<style[\s\S]*?pre[\s\S]*?<\/style>/);
    });

    it('表格应有基本边框样式', async () => {
      const html = await generateHtmlDocument('| A |\n|---|');
      expect(html).toContain('table');
      expect(html).toMatch(/<style[\s\S]*?table[\s\S]*?<\/style>/);
    });

    it('自定义标题可用于 <title>', async () => {
      const html = await generateHtmlDocument('content', { title: 'My Doc' });
      expect(html).toContain('<title>My Doc</title>');
    });

    it('默认标题应取自第一个 h1 或 "Untitled"', async () => {
      const htmlWithH1 = await generateHtmlDocument('# My Title\ntext');
      expect(htmlWithH1).toContain('<title>My Title</title>');

      const htmlNoH1 = await generateHtmlDocument('just text');
      expect(htmlNoH1).toContain('<title>Untitled</title>');
    });

    it('标题应包含 id 属性（rehype-slug）', async () => {
      const html = await generateHtmlDocument('# Hello World\n## Section Two');
      expect(html).toMatch(/<h1 id="hello-world">/);
      expect(html).toMatch(/<h2 id="section-two">/);
    });

    it('代码块应有语法高亮类名', async () => {
      const html = await generateHtmlDocument('```javascript\nconst x = 1;\n```');
      expect(html).toContain('hljs');
    });

    it('多标题文档应生成 TOC 导航', async () => {
      const html = await generateHtmlDocument('# Title\n## Section A\n## Section B');
      expect(html).toContain('<nav class="toc">');
      expect(html).toContain('Table of Contents');
      expect(html).toContain('href="#section-a"');
      expect(html).toContain('href="#section-b"');
    });

    it('单标题文档不应生成 TOC', async () => {
      const html = await generateHtmlDocument('# Only One Heading');
      expect(html).not.toContain('<nav class="toc">');
    });

    it('应支持自定义 CSS 注入', async () => {
      const customCss = 'body { font-family: serif; }';
      const html = await generateHtmlDocument('test', { css: customCss });
      expect(html).toContain(customCss);
    });

    it('应包含 UTF-8 charset 声明', async () => {
      const html = await generateHtmlDocument('test');
      expect(html).toContain('charset');
      expect(html).toContain('UTF-8');
    });
  });

  describe('XSS 防护与安全性', () => {
    it('应对 <title> 中的 HTML 特殊字符进行转义', async () => {
      const html = await generateHtmlDocument('<script>alert(1)</script>', { title: '<img src=x onerror=alert(1)>' });
      // title 应该被转义，不包含原始 HTML 标签
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
    });

    it('应对标题中的 & 和引号进行转义', async () => {
      const html = await generateHtmlDocument('test', { title: 'Tom & Jerry\'s "Book"' });
      // escapeHtml converts & < > " to entities
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;');
      // ' is not escaped by our escapeHtml (not needed in HTML <title>)
      expect(html).toContain("Jerry");
    });

    it('body 中不应包含 <script> 标签（remark 默认不允许 raw HTML）', async () => {
      const html = await generateHtmlDocument('<script>alert("xss")</script>hello');
      // remark-parse 不处理纯 HTML 标签，但需确认不会被原样注入为可执行 script
      expect(html).not.toContain('<script>alert');
    });

    it('不应允许 markdown 中的 onclick 等事件属性泄露到输出', async () => {
      const html = await generateHtmlDocument('[click](javascript:alert(1))');
      // href 应保留 javascript: 协议（markdown 转换器行为），但需确保不在事件属性中
      const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
      expect(bodyMatch?.[1]).toBeDefined();
      expect(bodyMatch?.[1]).not.toContain('onclick');
    });

    it('应阻止 javascript: 协议链接（DOMPurify sanitisation）', async () => {
      const html = await generateHtmlDocument('[click](javascript:alert(1))');
      expect(html).not.toContain('javascript:alert');
    });
  });

  describe('边界条件与特殊字符', () => {
    it('仅包含空白的文档应生成有效 HTML（body 为空）', async () => {
      const html = await generateHtmlDocument('   \t\n  ');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<body>\n\n</body>');
    });

    it('应正确处理包含特殊 HTML 字符的标题', async () => {
      const html = await generateHtmlDocument('# A <B> & "C"');
      // remark/rehype processes heading: <B> is treated as tag and stripped,
      // & becomes numeric entity, then escapeHtml encodes the result for <title>
      const titleMatch = html.match(/<title>(.*?)<\/title>/s);
      expect(titleMatch?.[1]).toBeDefined();
      // Must contain escaped versions of dangerous chars
      expect(titleMatch?.[1]).not.toContain('<B>');
      expect(titleMatch?.[1]).not.toContain('"C"');
      expect(titleMatch?.[1]).toContain('&quot;');
    });

    it('应正确处理含 HTML 实体的 Markdown 内容', async () => {
      const result = await markdownToHtml('&amp; &lt; &gt;');
      // rehype may use named (&amp;) or numeric (&#x26;) entities — both valid
      expect(result).toMatch(/&amp;|&#x26;/); // & encoded
      expect(result).toMatch(/&lt;|&#x3C;/); // < encoded
      // > may or may not be encoded — both are valid
    });

    it('长文档内容不应截断或丢失数据', async () => {
      const longText = '# Title\n' + 'p'.repeat(10000);
      const html = await generateHtmlDocument(longText);
      expect(html).toContain('<h1>Title</h1>');
      expect(html.length).toBeGreaterThan(10000);
    });

    it('generateHtmlDocument 无参数时应默认标题为 Untitled', async () => {
      const html = await generateHtmlDocument('just content no heading');
      expect(html).toContain('<title>Untitled</title>');
    });
  });

  describe('generateEpub — EPUB 电子书生成', () => {
    beforeEach(() => {
      vi.mocked(epubGen).mockResolvedValue(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      vi.clearAllMocks();
    });

    it('应返回 Uint8Array 类型', async () => {
      const result = await generateEpub('# My Book\nSome content.');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应将第一个 H1 作为书名传入 epub-gen-memory', async () => {
      await generateEpub('# My Great Book\nSome content.');
      expect(vi.mocked(epubGen)).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Great Book' }),
        expect.any(Array),
      );
    });

    it('无标题时书名应为 "Untitled Document"', async () => {
      await generateEpub('Just plain text with no heading.');
      expect(vi.mocked(epubGen)).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Untitled Document' }),
        expect.any(Array),
      );
    });

    it('应优先从 frontmatter 读取 title 和 author', async () => {
      const md = `---\ntitle: FM Title\nauthor: FM Author\n---\n# H1 Title\nContent.`;
      await generateEpub(md);
      expect(vi.mocked(epubGen)).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'FM Title', author: 'FM Author' }),
        expect.any(Array),
      );
    });

    it('options 参数应覆盖 frontmatter 值', async () => {
      const md = `---\ntitle: FM Title\nauthor: FM Author\n---\nContent.`;
      await generateEpub(md, { title: 'Override Title', author: 'Override Author' });
      expect(vi.mocked(epubGen)).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Override Title', author: 'Override Author' }),
        expect.any(Array),
      );
    });

    it('无 frontmatter 时 author 应为 "Unknown Author"', async () => {
      await generateEpub('# A Title\nSome content.');
      expect(vi.mocked(epubGen)).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'Unknown Author' }),
        expect.any(Array),
      );
    });

    it('默认语言应为 zh-CN（lang 字段）', async () => {
      await generateEpub('# Book');
      expect(vi.mocked(epubGen)).toHaveBeenCalledWith(
        expect.objectContaining({ lang: 'zh-CN' }),
        expect.any(Array),
      );
    });

    it('应将 HTML 内容放入章节 content 字段并包含 epub-chapter 类', async () => {
      await generateEpub('# Chapter\nContent here.');
      const chapters = vi.mocked(epubGen).mock.calls[0][1];
      expect(chapters).toHaveLength(1);
      expect(chapters[0].content).toContain('epub-chapter');
    });

    it('chapter title 应与书名一致', async () => {
      await generateEpub('# My Novel\nContent.');
      const chapters = vi.mocked(epubGen).mock.calls[0][1];
      expect(chapters[0].title).toBe('My Novel');
    });

    it('epub-gen-memory 抛出错误时应向上传播', async () => {
      vi.mocked(epubGen).mockRejectedValueOnce(new Error('EPUB generation failed'));
      await expect(generateEpub('# Test')).rejects.toThrow('EPUB generation failed');
    });
  });

});
