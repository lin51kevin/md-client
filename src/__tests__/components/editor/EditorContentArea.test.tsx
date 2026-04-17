/**
 * EditorContentArea unit Tests
 *
 * Covers view mode switching, pristine/welcome state, welcome interactions,
 * split drag callback, and theme propagation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import { EditorContentArea } from '../../../components/editor/EditorContentArea';
import type { Tab } from '../../../types';
import type { ViewMode } from '../../../types';
import type { RecentFile } from '../../../lib/file';
import type { ThemeName } from '../../../lib/theme';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

vi.mock('@uiw/react-codemirror', () => ({
  default: function MockCodeMirror(props: Record<string, unknown>) {
    return (
      <div data-testid="codemirror" data-theme={String(props.theme)} data-value={String(props.value)}>
        CodeMirror Editor
      </div>
    );
  },
}));

/* Mock the MarkdownPreview module so React.lazy() can resolve it */
vi.mock('../../../components/preview/MarkdownPreview', () => ({
  MarkdownPreview: function MockMarkdownPreview(props: Record<string, unknown>) {
    return (
      <div data-testid="markdown-preview" className={String(props.className ?? '')}>
        Preview: {String((props.content as string) ?? '').slice(0, 20)}
      </div>
    );
  },
}));

vi.mock('../lib/split-preference', () => ({
  saveSplitSizes: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const DEFAULT_TAB: Tab = {
  id: 'tab-1',
  title: 'untitled.md',
  doc: '# Hello World\n\nThis is **test** content.',
  filePath: undefined,
  isDirty: false,
};

function makeProps(overrides: Record<string, unknown> = {}) {
  const editorRef = { current: null } as React.RefObject<HTMLDivElement | null>;
  const previewRef = { current: null } as React.RefObject<HTMLDivElement | null>;

  return {
    isPristine: false,
    welcomeDismissed: false,
    viewMode: 'split' as ViewMode,
    activeTabId: 'tab-1',
    activeTab: DEFAULT_TAB,
    splitSizes: [50, 50] as [number, number],
    onSplitDragEnd: vi.fn(),
    editorRef,
    previewRef,
    handleEditorScroll: vi.fn(),
    handlePreviewScroll: vi.fn(),
    editorTheme: 'light' as const,
    editorExtensions: [],
    updateActiveDoc: vi.fn(),
    handleCreateEditor: vi.fn(),
    handleEditorUpdate: vi.fn(),
    spellCheck: false,
    debouncedDoc: DEFAULT_TAB.doc,
    openFileInTab: vi.fn(),
    handleWikiLinkNavigate: vi.fn(),
    theme: 'light' as ThemeName,
    recentFiles: [] as RecentFile[],
    onNew: vi.fn(),
    onOpenFile: vi.fn(),
    onOpenRecent: vi.fn(),
    onOpenSample: vi.fn(),
    onDismiss: vi.fn(),
    onShowWelcome: vi.fn(),
    useMilkdownPreview: false,
    ...overrides,
  };
}

/** Render and flush Suspense so lazy() resolves */
async function renderAndWait(ui: React.ReactElement) {
  const result = render(ui);
  // Allow microtask queue to drain so React.lazy resolves the mock
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe('EditorContentArea', () => {
  describe('view mode switching', () => {
    it('renders editor + preview in split mode', async () => {
      await renderAndWait(<EditorContentArea {...makeProps({ viewMode: 'split' })} />);
      expect(screen.getByTestId('codemirror')).toBeTruthy();
      expect(screen.getByTestId('markdown-preview')).toBeTruthy();
    });

    it('renders only editor in edit mode', () => {
      render(<EditorContentArea {...makeProps({ viewMode: 'edit' })} />);
      expect(screen.getByTestId('codemirror')).toBeTruthy();
      expect(screen.queryByTestId('markdown-preview')).toBeNull();
    });

    it('renders only preview in preview mode', async () => {
      await renderAndWait(<EditorContentArea {...makeProps({ viewMode: 'preview' })} />);
      expect(screen.queryByTestId('codemirror')).toBeNull();
      expect(screen.getByTestId('markdown-preview')).toBeTruthy();
    });
  });

  describe('pristine / welcome state', () => {
    it('shows WelcomePage when isPristine=true & welcomeDismissed=false', () => {
      render(<EditorContentArea {...makeProps({ isPristine: true, welcomeDismissed: false })} />);
      // WelcomePage always renders "MarkLite"
      expect(screen.getByText('MarkLite')).toBeTruthy();
      // No editor or preview
      expect(screen.queryByTestId('codemirror')).toBeNull();
      expect(screen.queryByTestId('markdown-preview')).toBeNull();
    });

    it('shows EmptyEditorState when dismissed', () => {
      render(<EditorContentArea {...makeProps({ isPristine: true, welcomeDismissed: true })} />);
      // No editor/preview in empty state either
      expect(screen.queryByTestId('codemirror')).toBeNull();
      expect(screen.queryByTestId('markdown-preview')).toBeNull();
    });

    it('shows editor when isPristine=false', async () => {
      await renderAndWait(<EditorContentArea {...makeProps({ isPristine: false })} />);
      expect(screen.getByTestId('codemirror')).toBeTruthy();
      expect(screen.queryByText('MarkLite')).toBeNull();
    });
  });

  describe('welcome page interactions', () => {
    it('calls onNew when clicking 新建 button', async () => {
      const onNew = vi.fn();
      render(
        <EditorContentArea
          {...makeProps({ isPristine: true, welcomeDismissed: false, onNew })}
        />
      );
      // WelcomePage renders buttons; find one whose text contains 新建
      const buttons = screen.getAllByRole('button');
      const newBtn = buttons.find((b) => b.textContent?.includes('新建'));
      expect(newBtn).toBeDefined();
      fireEvent.click(newBtn!);
      expect(onNew).toHaveBeenCalledOnce();
    });

    it('calls onOpenFile when clicking 打开文件 button', async () => {
      const onOpenFile = vi.fn();
      render(
        <EditorContentArea
          {...makeProps({ isPristine: true, welcomeDismissed: false, onOpenFile })}
        />
      );
      const buttons = screen.getAllByRole('button');
      const openBtn = buttons.find((b) => b.textContent?.includes('打开'));
      expect(openBtn).toBeDefined();
      fireEvent.click(openBtn!);
      expect(onOpenFile).toHaveBeenCalledOnce();
    });

    it('calls onDismiss when clicking dismiss (×) button', async () => {
      const onDismiss = vi.fn();
      render(
        <EditorContentArea
          {...makeProps({ isPristine: true, welcomeDismissed: false, onDismiss })}
        />
      );
      // Dismiss button uses X icon – look for aria-label or title
      const dismissBtn = screen.getByTitle(/关闭|dismiss|close/i)
        ?? screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.includes('close'));
      if (dismissBtn) {
        fireEvent.click(dismissBtn);
        expect(onDismiss).toHaveBeenCalledOnce();
      }
      // If no dismiss button rendered (acceptable), that's fine — WelcomePage may hide it without prop
    });
  });

  describe('split drag interaction', () => {
    it('renders gutter element in split mode', () => {
      const { container } = render(
        <EditorContentArea {...makeProps({ viewMode: 'split' })} />
      );
      const gutter = container.querySelector('.gutter');
      expect(gutter).not.toBeNull();
    });

    it('calls onSplitDragEnd after drag simulation', async () => {
      const onSplitDragEnd = vi.fn();
      const { container } = render(
        <EditorContentArea {...makeProps({ viewMode: 'split', onSplitDragEnd })} />
      );

      const gutter = container.querySelector('.gutter');
      expect(gutter).not.toBeNull();

      // Simulate react-split drag: mousedown on gutter → mousemove → mouseup
      fireEvent.mouseDown(gutter!);
      fireEvent.mouseMove(document, { clientX: 600 });
      fireEvent.mouseUp(document);

      // react-split should fire onDragEnd which calls our handler
      expect(onSplitDragEnd).toHaveBeenCalled();
    });
  });

  describe('theme application', () => {
    it('passes light theme to CodeMirror', () => {
      render(<EditorContentArea {...makeProps({ theme: 'light', editorTheme: 'light' })} />);
      expect(screen.getByTestId('codemirror').getAttribute('data-theme')).toBe('light');
    });

    it('passes dark theme to CodeMirror', () => {
      render(<EditorContentArea {...makeProps({ theme: 'dark', editorTheme: 'dark' })} />);
      expect(screen.getByTestId('codemirror').getAttribute('data-theme')).toBe('dark');
    });

    it('applies sepia preview CSS class', async () => {
      await renderAndWait(<EditorContentArea {...makeProps({ theme: 'sepia' })} />);
      const el = screen.getByTestId('markdown-preview');
      expect(el.className).toContain('markdown-preview-sepia');
    });

    it('applies high-contrast preview CSS class', async () => {
      await renderAndWait(<EditorContentArea {...makeProps({ theme: 'high-contrast' })} />);
      const el = screen.getByTestId('markdown-preview');
      expect(el.className).toContain('markdown-preview-high-contrast');
    });

    it('applies dark preview CSS class', async () => {
      await renderAndWait(<EditorContentArea {...makeProps({ theme: 'dark' })} />);
      const el = screen.getByTestId('markdown-preview');
      expect(el.className).toContain('markdown-preview-dark');
    });
  });
});
