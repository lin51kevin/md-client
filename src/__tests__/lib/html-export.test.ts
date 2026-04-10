import { describe, it, expect } from 'vitest';
import { markdownToHtml, generateHtmlDocument } from '../../lib/html-export';

describe('F005 — 导出 HTML', () => {

  describe('markdownToHtml — Markdown → HTML 片段转换', () => {
    it('应将标题转换为对应标签', async () => {
      expect(await markdownToHtml('# Hello')).toContain('<h1>Hello</h1>');
      expect(await markdownToHtml('## World')).toContain('<h2>World</h2>');
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
      expect(html).toContain('<h1>Hello World</h1>');
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

});
