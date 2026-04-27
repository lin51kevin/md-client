import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, extractHtmlTitle } from '../../../lib/markdown/html-import';

describe('HTML Import — htmlToMarkdown', () => {

  describe('基本 HTML 标签转换', () => {
    it('应将 h1-h6 标签转换为 Markdown 标题', () => {
      expect(htmlToMarkdown('<h1>Title</h1>')).toContain('# Title');
      expect(htmlToMarkdown('<h2>Sub</h2>')).toContain('## Sub');
      expect(htmlToMarkdown('<h3>H3</h3>')).toContain('### H3');
      expect(htmlToMarkdown('<h4>H4</h4>')).toContain('#### H4');
      expect(htmlToMarkdown('<h5>H5</h5>')).toContain('##### H5');
      expect(htmlToMarkdown('<h6>H6</h6>')).toContain('###### H6');
    });

    it('应将 <p> 标签转换为段落文本', () => {
      const result = htmlToMarkdown('<p>Hello world</p>');
      expect(result.trim()).toBe('Hello world');
    });

    it('应将 <strong>/<b> 转换为粗体', () => {
      expect(htmlToMarkdown('<strong>bold</strong>')).toContain('**bold**');
      expect(htmlToMarkdown('<b>bold</b>')).toContain('**bold**');
    });

    it('应将 <em>/<i> 转换为斜体', () => {
      expect(htmlToMarkdown('<em>italic</em>')).toContain('*italic*');
      expect(htmlToMarkdown('<i>italic</i>')).toContain('*italic*');
    });

    it('应将 <del>/<s> 转换为删除线', () => {
      expect(htmlToMarkdown('<del>deleted</del>')).toContain('~~deleted~~');
      expect(htmlToMarkdown('<s>deleted</s>')).toContain('~~deleted~~');
    });

    it('应将 <a> 标签转换为 Markdown 链接', () => {
      const result = htmlToMarkdown('<a href="https://example.com">link</a>');
      expect(result).toContain('[link](https://example.com)');
    });

    it('应将 <img> 标签转换为 Markdown 图片', () => {
      const result = htmlToMarkdown('<img src="photo.png" alt="Photo">');
      expect(result).toContain('![Photo](photo.png)');
    });

    it('应将 <code> 转换为行内代码', () => {
      const result = htmlToMarkdown('<p>Use <code>npm install</code></p>');
      expect(result).toContain('`npm install`');
    });

    it('应将 <pre><code> 转换为代码块', () => {
      const result = htmlToMarkdown('<pre><code>const x = 1;</code></pre>');
      expect(result).toContain('```');
      expect(result).toContain('const x = 1;');
    });

    it('应将 <blockquote> 转换为引用', () => {
      const result = htmlToMarkdown('<blockquote><p>Quote text</p></blockquote>');
      expect(result).toContain('> Quote text');
    });

    it('应将 <hr> 转换为水平线', () => {
      const result = htmlToMarkdown('<hr>');
      expect(result).toMatch(/---/);
    });
  });

  describe('列表转换', () => {
    it('应将 <ul> 转换为无序列表', () => {
      const result = htmlToMarkdown('<ul><li>A</li><li>B</li></ul>');
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toMatch(/-\s+A/);
      expect(result).toMatch(/-\s+B/);
    });

    it('应将 <ol> 转换为有序列表', () => {
      const result = htmlToMarkdown('<ol><li>First</li><li>Second</li></ol>');
      expect(result).toContain('1.');
      expect(result).toContain('First');
      expect(result).toContain('2.');
      expect(result).toContain('Second');
    });
  });

  describe('GFM 表格转换', () => {
    it('应将 <table> 转换为 GFM 表格', () => {
      const html = `
        <table>
          <thead><tr><th>Name</th><th>Age</th></tr></thead>
          <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
        </table>
      `;
      const result = htmlToMarkdown(html);
      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('Alice');
      expect(result).toContain('30');
      expect(result).toContain('|');
      expect(result).toContain('---');
    });
  });

  describe('完整 HTML 文档处理', () => {
    it('应从完整 HTML 文档中提取 <body> 内容', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title><style>body{}</style></head>
        <body><h1>Hello</h1><p>World</p></body>
        </html>
      `;
      const result = htmlToMarkdown(html);
      expect(result).toContain('# Hello');
      expect(result).toContain('World');
      // <style> 和 <head> 内容不应出现
      expect(result).not.toContain('body{}');
    });

    it('应处理没有 <body> 标签的 HTML 片段', () => {
      const result = htmlToMarkdown('<h1>Title</h1><p>Content</p>');
      expect(result).toContain('# Title');
      expect(result).toContain('Content');
    });
  });

  describe('边界情况', () => {
    it('应处理空字符串', () => {
      expect(htmlToMarkdown('')).toBe('');
    });

    it('应处理纯文本（无 HTML 标签）', () => {
      const result = htmlToMarkdown('Just plain text');
      expect(result.trim()).toBe('Just plain text');
    });

    it('应处理空白 HTML', () => {
      expect(htmlToMarkdown('   \n  ')).toBe('');
    });
  });

  describe('XSS 安全性', () => {
    it('应过滤 <script> 标签', () => {
      const result = htmlToMarkdown('<div><p>Hello</p><script>alert("xss")</script></div>');
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
    });

    it('应过滤 <style> 标签', () => {
      const result = htmlToMarkdown('<p>Hello</p><style>.evil{}</style>');
      expect(result).not.toContain('.evil');
      expect(result).toContain('Hello');
    });

    it('应过滤 on* 事件属性', () => {
      const result = htmlToMarkdown('<p onclick="alert(1)">Click</p>');
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click');
    });
  });

  describe('扩展标签转换', () => {
    it('应将 <pre><code class="language-js"> 转换为带语言的代码块', () => {
      const result = htmlToMarkdown('<pre><code class="language-javascript">const x = 1;</code></pre>');
      expect(result).toContain('```javascript');
      expect(result).toContain('const x = 1;');
    });

    it('应将无 class 的 <pre> 块转换为无语言标记的代码块', () => {
      const result = htmlToMarkdown('<pre>literal text\nno code child</pre>');
      expect(result).toContain('```');
      expect(result).toContain('literal text');
    });

    it('应将 <pre><code>（无语言 class）转换为无语言标记的代码块', () => {
      const result = htmlToMarkdown('<pre><code>plain code</code></pre>');
      expect(result).toContain('```');
      expect(result).toContain('plain code');
      expect(result).not.toContain('```javascript');
    });

    it('应将 AsciiDoc admonitionblock note 转换为 blockquote', () => {
      const html = `
        <div class="admonitionblock note">
          <table><tr>
            <td class="icon">NOTE</td>
            <td class="content"><p>This is a note.</p></td>
          </tr></table>
        </div>`;
      const result = htmlToMarkdown(html);
      expect(result).toContain('> **NOTE:**');
      expect(result).toContain('This is a note.');
    });

    it('应将 admonitionblock warning 转换为对应类型的 blockquote', () => {
      const html = `
        <div class="admonitionblock warning">
          <table><tr>
            <td class="icon">WARNING</td>
            <td class="content"><p>Be careful!</p></td>
          </tr></table>
        </div>`;
      const result = htmlToMarkdown(html);
      expect(result).toContain('> **WARNING:**');
      expect(result).toContain('Be careful!');
    });

    it('应将 admonitionblock important 转换为对应类型的 blockquote', () => {
      const html = `
        <div class="admonitionblock important">
          <table><tr>
            <td class="icon">IMPORTANT</td>
            <td class="content"><p>Must read.</p></td>
          </tr></table>
        </div>`;
      const result = htmlToMarkdown(html);
      expect(result).toContain('> **IMPORTANT:**');
    });

    it('应将 id="toc" 的 div 完全剔除（不保留 TOC 内容）', () => {
      const html = `
        <div id="toc">
          <ul><li><a href="#s1">Section 1</a></li></ul>
        </div>
        <h1>Hello</h1>`;
      const result = htmlToMarkdown(html);
      expect(result).toContain('# Hello');
      expect(result).not.toContain('Section 1');
      expect(result).not.toContain('toc');
    });

    it('应将 <mark> 转换为高亮', () => {
      expect(htmlToMarkdown('<p><mark>highlighted</mark></p>')).toContain('==highlighted==');
    });

    it('应将 <sub> 转换为下标', () => {
      expect(htmlToMarkdown('<p>H<sub>2</sub>O</p>')).toContain('~2~');
    });

    it('应将 <sup> 转换为上标', () => {
      expect(htmlToMarkdown('<p>x<sup>2</sup></p>')).toContain('^2^');
    });

    it('应将 <kbd> 转换为行内代码', () => {
      expect(htmlToMarkdown('<p>Press <kbd>Ctrl+C</kbd></p>')).toContain('`Ctrl+C`');
    });

    it('应保留 <u> 标签', () => {
      const result = htmlToMarkdown('<p><u>underlined</u></p>');
      expect(result).toContain('<u>underlined</u>');
    });

    it('应将 <dl>/<dt>/<dd> 转换为定义列表', () => {
      const result = htmlToMarkdown('<dl><dt>Term</dt><dd>Definition</dd></dl>');
      expect(result).toContain('**Term**');
      expect(result).toContain(': Definition');
    });

    it('应将 <figure>/<figcaption> 转换', () => {
      const result = htmlToMarkdown('<figure><img src="photo.png" alt="Photo"><figcaption>A photo</figcaption></figure>');
      expect(result).toContain('![Photo](photo.png)');
      expect(result).toContain('*A photo*');
    });

    it('应将 <details>/<summary> 保留为 HTML', () => {
      const result = htmlToMarkdown('<details><summary>Click me</summary><p>Hidden content</p></details>');
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Click me</summary>');
      expect(result).toContain('Hidden content');
    });

    it('应将 <video> 转换为链接', () => {
      const result = htmlToMarkdown('<video src="movie.mp4"></video>');
      expect(result).toContain('[Video](movie.mp4)');
    });

    it('应将 <audio> 转换为链接', () => {
      const result = htmlToMarkdown('<audio src="song.mp3"></audio>');
      expect(result).toContain('[Audio](song.mp3)');
    });

    it('应将 task list checkbox 转换', () => {
      const result = htmlToMarkdown('<ul><li><input type="checkbox" checked> Done</li><li><input type="checkbox"> Todo</li></ul>');
      expect(result).toContain('[x]');
      expect(result).toContain('[ ]');
    });

    it('应保留 <abbr> 标签及 title', () => {
      const result = htmlToMarkdown('<p><abbr title="HyperText Markup Language">HTML</abbr></p>');
      expect(result).toContain('abbr');
      expect(result).toContain('HTML');
    });
  });
});

describe('HTML Import — extractHtmlTitle', () => {
  it('应从 <title> 标签提取标题', () => {
    const html = '<html><head><title>My Page</title></head><body></body></html>';
    expect(extractHtmlTitle(html)).toBe('My Page');
  });

  it('如果没有 <title> 标签返回 undefined', () => {
    expect(extractHtmlTitle('<html><body></body></html>')).toBeUndefined();
  });

  it('应处理空 <title> 标签', () => {
    expect(extractHtmlTitle('<title></title>')).toBeUndefined();
  });

  it('应 trim 标题文本', () => {
    expect(extractHtmlTitle('<title>  My Page  </title>')).toBe('My Page');
  });
});
