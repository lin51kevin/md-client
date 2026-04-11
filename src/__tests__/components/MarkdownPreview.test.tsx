import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock Tauri and heavy deps that MarkdownPreview transitively imports
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
  openPath: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}));

// Stub mermaid (heavy canvas dependency not needed here)
vi.mock('../../lib/mermaid', () => ({ initMermaid: vi.fn() }));

import { MarkdownPreview } from '../../components/MarkdownPreview';

const noop = () => {};

describe('MarkdownPreview – FrontmatterPanel', () => {
  it('renders nothing when there is no frontmatter', async () => {
    render(
      <MarkdownPreview
        content="# Hello\n\nNo frontmatter here."
        className="preview"
        onOpenFile={noop}
      />,
    );
    expect(document.querySelector('.frontmatter-block')).toBeNull();
  });

  it('renders a table when frontmatter is present', async () => {
    const md = `---\ntitle: My Doc\nauthor: Alice\n---\n\n# Body`;
    render(
      <MarkdownPreview content={md} className="preview" onOpenFile={noop} />,
    );

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
    render(
      <MarkdownPreview content={md} className="preview" onOpenFile={noop} />,
    );

    const rows = document.querySelectorAll('.fm-table tr');
    const tagsRow = Array.from(rows).find(
      (r) => r.querySelector('.fm-key')?.textContent === 'tags',
    );
    expect(tagsRow?.querySelector('.fm-val')?.textContent).toBe('react, typescript');
  });

  it('does not use dangerouslySetInnerHTML (no raw HTML injected)', () => {
    const md = `---\ntitle: <script>alert(1)</script>\n---\n\nbody`;
    render(
      <MarkdownPreview content={md} className="preview" onOpenFile={noop} />,
    );

    // The XSS payload must not be rendered as an actual script element
    expect(document.querySelector('script')).toBeNull();

    // But the text content should appear as literal text in the cell
    const valCell = document.querySelector('.fm-val');
    expect(valCell?.textContent).toBe('<script>alert(1)</script>');
  });

  it('has aria-label on the frontmatter block', () => {
    const md = `---\ntitle: Accessible\n---\n\nbody`;
    render(
      <MarkdownPreview content={md} className="preview" onOpenFile={noop} />,
    );
    const block = document.querySelector('.frontmatter-block');
    expect(block?.getAttribute('aria-label')).toBe('Document metadata');
  });
});
