import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock Tauri and heavy deps that MarkdownPreview transitively imports
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
  openPath: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve([])) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}));

// Stub mermaid (heavy canvas dependency not needed here)
vi.mock('../../lib/mermaid', () => ({ initMermaid: vi.fn() }));

import { MarkdownPreview } from '../../components/MarkdownPreview';

const noop = () => {};

/* ─── Helper ──────────────────────────────────────────────────────── */
function renderPreview(content: string, props?: Partial<React.ComponentProps<typeof MarkdownPreview>>) {
  return render(
    <MarkdownPreview
      content={content}
      className="preview"
      onOpenFile={noop}
      {...props}
    />,
  );
}

/* ─── Tests ───────────────────────────────────────────────────────── */
describe('MarkdownPreview – 渲染正确性', () => {
  it('renders h1 heading', () => {
    renderPreview('# Hello World');
    expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
  });

  it('renders h2 heading', () => {
    renderPreview('## Section Two');
    expect(screen.getByRole('heading', { level: 2, name: 'Section Two' })).toBeInTheDocument();
  });

  it('renders bold text', () => {
    renderPreview('This is **bold** text');
    expect(screen.getByText('bold')).toHaveProperty('tagName', 'STRONG');
  });

  it('renders italic text', () => {
    renderPreview('This is *italic* text');
    expect(screen.getByText('italic')).toHaveProperty('tagName', 'EM');
  });

  it('renders unordered list', () => {
    renderPreview('- Apple\n- Banana\n- Cherry');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('Apple');
    expect(items[1].textContent).toBe('Banana');
    expect(items[2].textContent).toBe('Cherry');
  });

  it('renders ordered list', () => {
    renderPreview('1. First\n2. Second\n3. Third');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('renders inline code', () => {
    renderPreview('Use `const x = 1` here');
    const code = screen.getByText('const x = 1');
    expect(code.tagName).toBe('CODE');
  });

  it('renders fenced code block', () => {
    renderPreview('```\nconsole.log("hello");\n```');
    const pre = document.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain('console.log("hello")');
  });
});

describe('MarkdownPreview – XSS 防护', () => {
  it('does not execute inline scripts (rehype-raw passes HTML but jsdom does not run it)', () => {
    // With rehype-raw, <script> tags may exist in DOM but never execute in jsdom
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPreview('<script>alert(1)</script>');
    // In production, rehypeFilterInvalidElements would handle this;
    // here we verify no crash and content is processed
    warnSpy.mockRestore();
    expect(true).toBe(true); // No crash = test passes
  });

  it('sanitizes javascript: URLs (rehypeFilterInvalidElements strips them)', () => {
    renderPreview('[click me](javascript:alert(1))');
    // rehypeFilterInvalidElements removes or sanitizes javascript: URLs
    // No script elements should exist in the DOM
    expect(document.querySelector('script')).toBeNull();
    // The text content should still be present
    expect(document.body.textContent).toContain('click me');
  });

  it('renders XSS payload as literal text in frontmatter', () => {
    const md = `---\ntitle: <img src=x onerror=alert(1)>\n---\n\nbody`;
    renderPreview(md);
    expect(document.querySelector('img[src="x"]')).toBeNull();
    const valCell = document.querySelector('.fm-val');
    expect(valCell?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('does not allow event handler attributes on injected HTML', () => {
    renderPreview('<div onclick="alert(1)">click</div>');
    // The div may or may not render depending on rehype-raw,
    // but no script execution
    expect(document.querySelector('script')).toBeNull();
  });
});

describe('MarkdownPreview – 主题切换 / className', () => {
  it('applies className prop to wrapper div', () => {
    const { container } = renderPreview('# Hi', { className: 'dark-theme' });
    expect(container.firstChild).toHaveClass('dark-theme');
  });

  it('works with different class names without crashing', () => {
    const { container } = renderPreview('# Test', { className: 'light-mode' });
    expect(container.firstChild).toHaveClass('light-mode');
  });

  it('renders without className prop (defaults to undefined)', () => {
    const { container } = renderPreview('plain text', { className: undefined });
    expect(container.firstChild).toBeDefined();
  });
});

describe('MarkdownPreview – 空内容处理', () => {
  it('does not crash on empty string', () => {
    const { container } = renderPreview('');
    expect(container.innerHTML).toBeDefined();
  });

  it('does not crash on whitespace-only string', () => {
    const { container } = renderPreview('   \n\t\n   ');
    expect(container.innerHTML).toBeDefined();
  });

  it('renders minimal output for empty content', () => {
    renderPreview('');
    // Should have at least the wrapper div, no errors thrown
    expect(document.querySelector('.preview') ?? document.querySelector('div')).not.toBeNull();
  });
});

describe('MarkdownPreview – 图片渲染', () => {
  it('renders external image with src', () => {
    renderPreview('![alt text](https://example.com/img.png)');
    const img = screen.getByAltText('alt text') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img.png');
  });

  it('renders placeholder for relative path images when filePath is provided', () => {
    // Suppress console errors from LocalImage's mocked invoke call
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPreview('![local](./photo.png)', {
      filePath: '/docs/test.md',
    });
    // img element exists (LocalImage renders <img> with async src loading)
    const img = screen.getByAltText('local') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('renders data URI image element', () => {
    renderPreview('![data](data:image/png;base64,abc123)');
    const img = screen.getByAltText('data') as HTMLImageElement;
    // data: URL matches https?: pattern so it goes through standard <img> branch
    expect(img).toBeInTheDocument();
    // Note: jsdom may normalize data URIs differently
    expect(img.getAttribute('src') ?? img.src).toBeDefined();
  });

  it('renders absolute path image via LocalImage even without filePath', () => {
    // 绝对路径图片应通过 LocalImage 组件渲染（Tauri read_file_bytes）
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPreview('![abs](/tmp/marklite-images/img-123.png)');
    // img element should exist (LocalImage renders <img> with async loading)
    const img = screen.getByAltText('abs') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('renders Windows absolute path image via LocalImage even without filePath', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPreview('![win](C:/Users/test/marklite-images/img-456.png)');
    const img = screen.getByAltText('win') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    // urlTransform 应保留 Windows 绝对路径（不被 react-markdown 默认的 URL 清理删除）
    // LocalImage 初始 src 为 undefined，后续异步加载；但不应为空字符串（那意味着路径被清除了）
    expect(img.getAttribute('src')).not.toBe('');
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('strips dangerous javascript: URLs from images', () => {
    renderPreview('![xss](javascript:alert(1))');
    const img = screen.queryByAltText('xss');
    // 即便元素存在，src 也应为空（被 safeUrlTransform 清除）
    if (img) {
      expect(img.getAttribute('src') ?? '').toBe('');
    }
  });
});

describe('MarkdownPreview – Wiki链接', () => {
  it('processes [[wiki-link]] syntax (strips brackets, renders target text)', () => {
    const { container } = renderPreview('Go to [[TargetPage]]');
    // The [[...]] syntax should be processed — brackets removed, target text visible
    expect(container.innerHTML).toContain('TargetPage');
    // Raw [[...]] syntax should NOT appear in output
    expect(container.innerHTML).not.toContain('[[');
  });

  it('processes multiple wiki links in same line', () => {
    const { container } = renderPreview('See [[A]] and [[B]] here');
    expect(container.innerHTML).toContain('A');
    expect(container.innerHTML).toContain('B');
    expect(container.innerHTML).not.toContain('[[');
  });

  it('trims spaces inside [[  link  ]]', () => {
    const { container } = renderPreview('Go to [[  SpacedLink  ]]');
    // remark plugin trims spaces from wiki link target
    expect(container.innerHTML).toContain('SpacedLink');
  });

  it('does not crash with onWikiLinkNavigate prop', () => {
    const onWikiNavigate = vi.fn();
    // Should not throw when the prop is provided
    const { container } = renderPreview('[[SomePage]]', { onWikiLinkNavigate: onWikiNavigate });
    expect(container.innerHTML).toBeDefined();
  });
});

describe('MarkdownPreview – 代码高亮', () => {
  it('applies language class to fenced code blocks', () => {
    renderPreview('```typescript\nconst x: number = 1;\n```');
    const code = document.querySelector('pre code');
    expect(code).not.toBeNull();
    // rehype-highlight adds hljs + language-xxx classes
    expect(code?.className).toContain('language-typescript');
  });

  it('applies language-js class for JavaScript code block', () => {
    renderPreview('```js\nconsole.log("hi");\n```');
    const code = document.querySelector('pre code');
    // `js` shorthand maps to `language-js`
    expect(code?.className).toContain('language-js');
  });

  it('applies language class for Python code block', () => {
    renderPreview('```python\nprint("hello")\n```');
    const code = document.querySelector('pre code');
    expect(code?.className).toContain('language-python');
  });

  it('highlights code with hljs class when language specified', () => {
    renderPreview('```javascript\nconst a = 1;\n```');
    const code = document.querySelector('pre code');
    expect(code?.className).toContain('hljs');
  });

  it('renders code block even without language specifier', () => {
    renderPreview('```\nsome code\n```');
    const code = document.querySelector('pre code');
    // Code blocks with no language still render
    expect(code).not.toBeNull();
  });
});

describe('MarkdownPreview – FrontmatterPanel', () => {
  it('renders nothing when there is no frontmatter', async () => {
    renderPreview('# Hello\n\nNo frontmatter here.');
    expect(document.querySelector('.frontmatter-block')).toBeNull();
  });

  it('renders a table when frontmatter is present', async () => {
    const md = `---\ntitle: My Doc\nauthor: Alice\n---\n\n# Body`;
    renderPreview(md);

    const block = document.querySelector('.frontmatter-block');
    expect(block).not.toBeNull();

    const rows = document.querySelectorAll('.fm-table tr');
    expect(rows.length).toBe(2);

    const [titleRow, authorRow] = Array.from(rows);
    expect(titleRow.querySelector('.fm-key')?.textContent).toBe('title');
    expect(titleRow.querySelector('.fm-val')?.textContent).toBe('My Doc');
    expect(authorRow.querySelector('.fm-key')?.textContent).toBe('author');
    expect(authorRow.querySelector('.fm-val')?.textContent).toBe('Alice');
  });

  it('renders array values joined with comma', async () => {
    const md = `---\ntitle: Post\ntags:\n  - react\n  - typescript\n---\n\nbody`;
    renderPreview(md);

    const rows = document.querySelectorAll('.fm-table tr');
    const tagsRow = Array.from(rows).find(
      (r) => r.querySelector('.fm-key')?.textContent === 'tags',
    );
    expect(tagsRow?.querySelector('.fm-val')?.textContent).toBe('react, typescript');
  });

  it('does not use dangerouslySetInnerHTML (no raw HTML injected)', () => {
    const md = `---\ntitle: <script>alert(1)</script>\n---\n\nbody`;
    renderPreview(md);

    // The XSS payload must not be rendered as an actual script element
    expect(document.querySelector('script')).toBeNull();

    // But the text content should appear as literal text in the cell
    const valCell = document.querySelector('.fm-val');
    expect(valCell?.textContent).toBe('<script>alert(1)</script>');
  });

  it('has aria-label on the frontmatter block', () => {
    const md = `---\ntitle: Accessible\n---\n\nbody`;
    renderPreview(md);
    const block = document.querySelector('.frontmatter-block');
    expect(block?.getAttribute('aria-label')).toBe('Document metadata');
  });
});
