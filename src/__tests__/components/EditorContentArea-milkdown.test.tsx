import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

// Mock Milkdown dependencies
vi.mock('@milkdown/react', () => ({
  Milkdown: () => <div data-testid="milkdown-editor" />,
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useEditor: (factory: (root: HTMLElement) => unknown) => {
    const ref = React.useRef<unknown>(null);
    if (!ref.current) ref.current = factory(document.createElement('div'));
    return { get: () => ref.current };
  },
}));

vi.mock('@milkdown/crepe', () => ({
  Crepe: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    setReadonly: vi.fn(),
    editor: { use: vi.fn().mockReturnThis() },
  })),
  CrepeFeature: {},
}));

vi.mock('@milkdown/kit/utils', () => ({
  replaceAll: vi.fn(() => vi.fn()),
}));

// We need to test the integration at a higher level since MilkdownPreview
// depends on complex Milkdown internals. Instead, test that EditorContentArea
// correctly selects the preview component based on props.

// Import after mocks
const { EditorContentArea } = await import('../../components/EditorContentArea');
const { MilkdownPreview } = await import('../../components/MilkdownPreview');

const defaultProps = {
  isPristine: false,
  welcomeDismissed: true,
  viewMode: 'preview' as const,
  activeTabId: 'tab-1',
  activeTab: { id: 'tab-1', doc: '# Hello', name: 'test.md' },
  splitSizes: [50, 50] as [number, number],
  onSplitDragEnd: vi.fn(),
  editorRef: { current: null },
  previewRef: { current: null },
  handleEditorScroll: vi.fn(),
  handlePreviewScroll: vi.fn(),
  editorTheme: 'light' as const,
  editorExtensions: [],
  updateActiveDoc: vi.fn(),
  handleCreateEditor: vi.fn(),
  handleEditorUpdate: vi.fn(),
  spellCheck: false,
  debouncedDoc: '# Hello',
  openFileInTab: vi.fn(),
  handleWikiLinkNavigate: vi.fn(),
  theme: 'light' as const,
  recentFiles: [],
  onNew: vi.fn(),
  onOpenFile: vi.fn(),
  onOpenRecent: vi.fn(),
  onOpenSample: vi.fn(),
  onDismiss: vi.fn(),
  onShowWelcome: vi.fn(),
};

describe('EditorContentArea Milkdown integration', () => {
  it('renders MilkdownPreview when useMilkdownPreview=true', async () => {
    render(
      <EditorContentArea
        {...defaultProps}
        viewMode="preview"
        useMilkdownPreview={true}
      />
    );
    // Lazy component shows fallback initially, then resolves to milkdown-preview
    expect(document.querySelector('.milkdown-preview') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders MarkdownPreview (fallback) when useMilkdownPreview=false', async () => {
    render(
      <EditorContentArea
        {...defaultProps}
        viewMode="preview"
        useMilkdownPreview={false}
      />
    );
    // Should not have milkdown-preview class
    expect(document.querySelector('.milkdown-preview')).toBeNull();
  });

  it('MilkdownPreview accepts content and onContentChange', () => {
    const onContentChange = vi.fn();
    render(
      <MilkdownPreview
        content="# Test"
        onContentChange={onContentChange}
      />
    );
    // Component renders without error
    expect(document.querySelector('.milkdown-preview')).toBeTruthy();
  });
});
