import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/markdown/html-export', () => ({
  markdownToHtml: vi.fn(async (md: string) => `<p>${md.replace(/^# /, '')}</p>`),
}));

vi.mock('../../../lib/markdown/katex-bridge', () => ({
  getKatexCSSString: vi.fn(() => '.katex{}'),
}));

vi.mock('highlight.js/styles/github.css?raw', () => ({
  default: '/* highlight css */',
}));

import { generatePdfHtml } from '../../../lib/export/pdf-html-generator';
import { markdownToHtml } from '../../../lib/markdown/html-export';

describe('generatePdfHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a complete HTML document', async () => {
    const html = await generatePdfHtml('# Hello\n\nWorld');
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
  });

  it('includes the document title from H1', async () => {
    const html = await generatePdfHtml('# My Document\n\nSome text');
    expect(html).toContain('<title>My Document</title>');
  });

  it('uses frontmatter title when present', async () => {
    const md = '---\ntitle: FM Title\n---\n\n# Body Heading';
    const html = await generatePdfHtml(md);
    expect(html).toContain('<title>FM Title</title>');
  });

  it('falls back to "Document" when no title found', async () => {
    const html = await generatePdfHtml('just some text without heading');
    expect(html).toContain('<title>Document</title>');
  });

  it('calls markdownToHtml with the markdown content', async () => {
    await generatePdfHtml('# Test\n\nBody');
    expect(markdownToHtml).toHaveBeenCalledWith('# Test\n\nBody');
  });

  it('includes @page CSS rule', async () => {
    const html = await generatePdfHtml('# Test');
    expect(html).toContain('@page');
    expect(html).toContain('size: A4');
  });

  it('includes KaTeX CSS', async () => {
    const html = await generatePdfHtml('# Test');
    expect(html).toContain('.katex{}');
  });

  it('includes highlight.js CSS', async () => {
    const html = await generatePdfHtml('# Test');
    expect(html).toContain('/* highlight css */');
  });

  it('does not include TOC section', async () => {
    const html = await generatePdfHtml('# Intro\n## Section 1\n## Section 2');
    expect(html).not.toContain('class="toc"');
    expect(html).not.toContain('Table of Contents');
  });

  it('escapes special characters in title', async () => {
    const html = await generatePdfHtml('# <script>alert(1)</script>');
    // Title tag must be escaped; body HTML is rendered by markdownToHtml (trusted pipeline)
    expect(html).toMatch(/<title>[^<]*&lt;script&gt;[^<]*<\/title>/);
  });

  it('handles empty markdown gracefully', async () => {
    const html = await generatePdfHtml('');
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>Document</title>');
  });
});
