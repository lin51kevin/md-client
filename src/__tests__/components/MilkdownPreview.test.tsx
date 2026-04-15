import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────

const mockSetReadonly = vi.fn().mockReturnThis();
const mockCreate = vi.fn().mockResolvedValue({});
const mockEditor = { action: vi.fn() };

/** Stores the callback registered via listener.markdownUpdated() so tests can invoke it. */
let registeredMarkdownCallback: ((_ctx: unknown, _newMd: string, _prevMd: string) => void) | null = null;

const mockListenerManager = {
  markdownUpdated: vi.fn((callback: (_ctx: unknown, _newMd: string, _prevMd: string) => void) => {
    registeredMarkdownCallback = callback;
  }),
};

vi.mock('@milkdown/crepe', () => ({
  Crepe: vi.fn().mockImplementation(() => ({
    create: mockCreate,
    setReadonly: mockSetReadonly,
    on: vi.fn((fn: (listener: unknown) => void) => fn(mockListenerManager)),
    editor: mockEditor,
  })),
  CrepeFeature: {
    CodeBlock: 'CodeBlock',
    Cursor: 'Cursor',
    Indent: 'Indent',
    TrailingParagraph: 'TrailingParagraph',
    Upload: 'Upload',
    LinkTooltip: 'LinkTooltip',
    ImageTooltip: 'ImageTooltip',
    BlockEdit: 'BlockEdit',
    Placeholder: 'Placeholder',
    Diagram: 'Diagram',
    Clipboard: 'Clipboard',
    Prism: 'Prism',
    Listener: 'Listener',
    History: 'History',
    Slash: 'Slash',
    BlockHandle: 'BlockHandle',
  },
}));

const mockGet = vi.fn().mockReturnValue(null);

vi.mock('@milkdown/react', () => ({
  Milkdown: () => React.createElement('div', { 'data-testid': 'milkdown-editor' }),
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => children,
  useEditor: (factory: (root: string) => Promise<unknown>) => {
    act(() => { factory('mock-root'); });
    return { get: mockGet };
  },
}));

vi.mock('@milkdown/crepe/theme/frame.css', () => ({}));
vi.mock('katex/dist/katex.min.css', () => ({}));
vi.mock('./theme.css', () => ({}));

import { MilkdownPreview } from '../../components/MilkdownPreview';

const noop = () => {};

describe('MilkdownPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredMarkdownCallback = null;
  });

  it('renders the editor container', () => {
    render(<MilkdownPreview content="# Hello" onContentChange={noop} />);
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('creates Crepe instance with default content', async () => {
    const { Crepe } = await import('@milkdown/crepe');
    render(<MilkdownPreview content="# Test" onContentChange={noop} />);
    expect(Crepe).toHaveBeenCalledWith(
      expect.objectContaining({ defaultValue: '# Test' })
    );
  });

  it('registers markdownUpdated listener via crepe.on()', () => {
    render(<MilkdownPreview content="test" onContentChange={noop} />);
    expect(mockListenerManager.markdownUpdated).toHaveBeenCalled();
    expect(registeredMarkdownCallback).not.toBeNull();
  });

  it('calls onContentChange when Milkdown content is edited', () => {
    const onChange = vi.fn();
    render(<MilkdownPreview content="initial" onContentChange={onChange} />);

    act(() => {
      registeredMarkdownCallback!({}, 'edited content', 'initial');
    });
    expect(onChange).toHaveBeenCalledWith('edited content');
  });

  it('does not trigger duplicate callbacks for same content', () => {
    const onChange = vi.fn();
    render(<MilkdownPreview content="initial" onContentChange={onChange} />);

    act(() => {
      registeredMarkdownCallback!({}, 'same', 'same');
    });
    // Component only calls onContentChange when newMarkdown !== prevMarkdown
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies className prop', () => {
    const { container } = render(
      <MilkdownPreview content="test" onContentChange={noop} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies default class when no className provided', () => {
    const { container } = render(
      <MilkdownPreview content="test" onContentChange={noop} />
    );
    expect(container.firstChild).toHaveClass('milkdown-preview');
  });

  it('calls setReadonly(true) when editable=false', async () => {
    await import('@milkdown/crepe');
    render(<MilkdownPreview content="test" onContentChange={noop} editable={false} />);
    expect(mockSetReadonly).toHaveBeenCalledWith(true);
  });

  it('does not call setReadonly when editable=true (default)', async () => {
    await import('@milkdown/crepe');
    render(<MilkdownPreview content="test" onContentChange={noop} editable={true} />);
    // editable=true is the default; setReadonly is only called when switching to false
    expect(mockSetReadonly).not.toHaveBeenCalledWith(false);
  });

  it('handles empty content without crashing', () => {
    render(<MilkdownPreview content="" onContentChange={noop} />);
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('does not crash on re-render with new content', () => {
    const { rerender } = render(
      <MilkdownPreview content="first" onContentChange={noop} />
    );
    expect(() =>
      rerender(<MilkdownPreview content="second" onContentChange={noop} />)
    ).not.toThrow();
  });
});
