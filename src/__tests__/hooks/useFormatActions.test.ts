import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFormatActions } from '../../hooks/useFormatActions';
import { milkdownBridge } from '../../lib/milkdown/editor-bridge';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

/** Creates a real CodeMirror EditorView for action testing */
function makeView(doc: string, selFrom = 0, selTo = 0): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor: selFrom, head: selTo },
  });
  return new EditorView({ state, parent: document.body });
}

/** Builds the hook with a given view (or null) */
function buildHook(view: EditorView | null) {
  const cmViewRef = { current: view };
  const mockGetActiveTab = vi.fn(() => ({
    id: '1',
    filePath: '/docs/test.md',
    doc: view?.state.doc.toString() ?? '',
    isDirty: false,
  }));
  const mockPromptUser = vi.fn();
  const { result } = renderHook(() =>
    useFormatActions({
      cmViewRef: cmViewRef as any,
      getActiveTab: mockGetActiveTab as any,
      promptUser: mockPromptUser,
    })
  );
  return { action: result.current.handleFormatAction, mockPromptUser };
}

describe('useFormatActions', () => {
  const views: EditorView[] = [];

  afterEach(() => {
    views.forEach(v => v.destroy());
    views.length = 0;
    vi.clearAllMocks();
  });

  function createView(doc: string, selFrom = 0, selTo = 0) {
    const v = makeView(doc, selFrom, selTo);
    views.push(v);
    return v;
  }

  // ── Basic API ──────────────────────────────────────────────────────────────

  it('返回 handleFormatAction 函数', () => {
    const { action } = buildHook(null);
    expect(typeof action).toBe('function');
  });

  it('cmView 为 null 时不报错', () => {
    const { action } = buildHook(null);
    expect(() => action('bold')).not.toThrow();
  });

  // ── Bold ──────────────────────────────────────────────────────────────────

  it('bold — 无选区时插入占位符 ****', () => {
    const view = createView('hello', 5, 5);
    const { action } = buildHook(view);
    action('bold');
    expect(view.state.doc.toString()).toBe('hello****');
  });

  it('bold — 有选区时包装选中文本', () => {
    const view = createView('hello world', 0, 5);
    const { action } = buildHook(view);
    action('bold');
    expect(view.state.doc.toString()).toBe('**hello** world');
  });

  it('bold — 已包装时去除包装（toggle）', () => {
    // Select "**hello**" (full wrapper included)
    const view = createView('**hello** world', 0, 9);
    const { action } = buildHook(view);
    action('bold');
    expect(view.state.doc.toString()).toBe('hello world');
  });
  it('bold — 多行选区时每一行都包装且光标停在首行包装内', () => {
    const doc = 'line1\nline2';
    const view = createView(doc, 0, doc.length);
    const { action } = buildHook(view);
    action('bold');
    expect(view.state.doc.toString()).toBe('**line1**\n**line2**');
    expect(view.state.selection.main.anchor).toBe(2);
  });


  // ── Italic ────────────────────────────────────────────────────────────────

  it('italic — 有选区时包装为斜体', () => {
    const view = createView('hello world', 0, 5);
    const { action } = buildHook(view);
    action('italic');
    expect(view.state.doc.toString()).toBe('*hello* world');
  });

  // ── Strikethrough ─────────────────────────────────────────────────────────

  it('strikethrough — 有选区时包装为删除线', () => {
    const view = createView('hello world', 6, 11);
    const { action } = buildHook(view);
    action('strikethrough');
    expect(view.state.doc.toString()).toBe('hello ~~world~~');
  });

  // ── Code (inline) ─────────────────────────────────────────────────────────

  it('code — 无选区时插入空行内代码', () => {
    const view = createView('', 0, 0);
    const { action } = buildHook(view);
    action('code');
    expect(view.state.doc.toString()).toBe('``');
  });

  it('code — 有选区时包装为行内代码', () => {
    const view = createView('foo bar', 4, 7);
    const { action } = buildHook(view);
    action('code');
    expect(view.state.doc.toString()).toBe('foo `bar`');
  });

  // ── Heading ───────────────────────────────────────────────────────────────

  it('heading — 在行前添加 # 前缀', () => {
    const view = createView('Hello', 0, 0);
    const { action } = buildHook(view);
    action('heading');
    expect(view.state.doc.toString()).toBe('# Hello');
  });

  it('heading — 已有 H1 前缀时升级为 H2', () => {
    const view = createView('# Hello', 2, 2);
    const { action } = buildHook(view);
    action('heading');
    expect(view.state.doc.toString()).toBe('## Hello');
  });

  it('heading — H6 时去除所有标题前缀', () => {
    const view = createView('###### Hello', 2, 2);
    const { action } = buildHook(view);
    action('heading');
    expect(view.state.doc.toString()).toBe('Hello');
  });

  // ── Blockquote ────────────────────────────────────────────────────────────

  it('blockquote — 在行前添加 > 前缀', () => {
    const view = createView('Some text', 0, 0);
    const { action } = buildHook(view);
    action('blockquote');
    expect(view.state.doc.toString()).toBe('> Some text');
  });

  // ── Unordered list ────────────────────────────────────────────────────────

  it('ul — 在行前添加 - 前缀', () => {
    const view = createView('item', 0, 0);
    const { action } = buildHook(view);
    action('ul');
    expect(view.state.doc.toString()).toBe('- item');
  });

  it('ul — 多行选区时每行都添加 - 前缀', () => {
    const doc = 'line1\nline2';
    const view = createView(doc, 0, doc.length);
    const { action } = buildHook(view);
    action('ul');
    expect(view.state.doc.toString()).toBe('- line1\n- line2');
  });

  // ── Ordered list ──────────────────────────────────────────────────────────

  it('ol — 在行前添加 1. 前缀', () => {
    const view = createView('item', 0, 0);
    const { action } = buildHook(view);
    action('ol');
    expect(view.state.doc.toString()).toBe('1. item');
  });

  // ── HR ────────────────────────────────────────────────────────────────────

  it('hr — 在行尾插入分割线', () => {
    const view = createView('title', 5, 5);
    const { action } = buildHook(view);
    action('hr');
    expect(view.state.doc.toString()).toContain('---');
  });

  // ── Task list ─────────────────────────────────────────────────────────────

  it('task — 在行前添加 - [ ] 前缀', () => {
    const view = createView('Do something', 0, 0);
    const { action } = buildHook(view);
    action('task');
    expect(view.state.doc.toString()).toBe('- [ ] Do something');
  });

  it('task — 已有任务前缀时去除', () => {
    const view = createView('- [ ] Do something', 0, 0);
    const { action } = buildHook(view);
    action('task');
    expect(view.state.doc.toString()).toBe('Do something');
  });

  // ── Code block ────────────────────────────────────────────────────────────

  it('codeblock — 无选区时插入空代码块并将光标置于其中', () => {
    const view = createView('', 0, 0);
    const { action } = buildHook(view);
    action('codeblock');
    expect(view.state.doc.toString()).toBe('```\n\n```');
  });

  it('codeblock — 有选区时包装为代码块', () => {
    const view = createView('const x = 1', 0, 11);
    const { action } = buildHook(view);
    action('codeblock');
    expect(view.state.doc.toString()).toBe('```\nconst x = 1\n```');
  });

  // ── Math ──────────────────────────────────────────────────────────────────

  it('math — 无选区时插入块级数学公式', () => {
    const view = createView('', 0, 0);
    const { action } = buildHook(view);
    action('math');
    expect(view.state.doc.toString()).toBe('$$\n\n$$');
  });

  it('math — 有选区时包装为行内数学公式', () => {
    const view = createView('E=mc^2', 0, 6);
    const { action } = buildHook(view);
    action('math');
    expect(view.state.doc.toString()).toBe('$E=mc^2$');
  });

  // ── Table ─────────────────────────────────────────────────────────────────

  it('table:2x3 — 插入 2 行 3 列的 Markdown 表格', () => {
    const view = createView('', 0, 0);
    const { action } = buildHook(view);
    action('table:2x3');
    const doc = view.state.doc.toString();
    expect(doc).toContain('| Col 1 |');
    expect(doc).toContain('| Col 2 |');
    expect(doc).toContain('| Col 3 |');
    expect(doc).toContain('| --- |');
    // Header + separator + 2 body rows
    const lines = doc.split('\n').filter(Boolean);
    expect(lines.length).toBe(4); // header, separator, row1, row2
  });

  it('table:1x1 — 插入最小表格', () => {
    const view = createView('', 0, 0);
    const { action } = buildHook(view);
    action('table:1x1');
    const doc = view.state.doc.toString();
    expect(doc).toContain('| Col 1 |');
    expect(doc).toContain('| --- |');
  });

  it('table — 超出范围的维度（0 行）不产生任何输出', () => {
    const view = createView('text', 4, 4);
    const { action } = buildHook(view);
    action('table:0x3');
    expect(view.state.doc.toString()).toBe('text');
  });

  it('table — 超出范围的维度（> 20 列）不产生任何输出', () => {
    const view = createView('text', 4, 4);
    const { action } = buildHook(view);
    action('table:3x21');
    expect(view.state.doc.toString()).toBe('text');
  });

  // ── Link (async) ──────────────────────────────────────────────────────────

  it('link — promptUser 被调用', async () => {
    const view = createView('click here', 0, 10);
    const { action, mockPromptUser } = buildHook(view);
    mockPromptUser.mockResolvedValue(null); // user cancels
    action('link');
    await vi.waitFor(() => {
      expect(mockPromptUser).toHaveBeenCalledTimes(1);
    });
  });

  it('link — 取消时不修改文档', async () => {
    const view = createView('click here', 0, 10);
    const { action, mockPromptUser } = buildHook(view);
    mockPromptUser.mockResolvedValue(null);
    action('link');
    await vi.waitFor(() => expect(mockPromptUser).toHaveBeenCalled());
    expect(view.state.doc.toString()).toBe('click here');
  });

  it('link — 确认后插入 Markdown 链接', async () => {
    const view = createView('click here', 0, 10);
    const { action, mockPromptUser } = buildHook(view);
    mockPromptUser.mockResolvedValue('https://example.com');
    action('link');
    await vi.waitFor(() => {
      expect(view.state.doc.toString()).toContain('https://example.com');
    });
  });

  // ── Unknown action ────────────────────────────────────────────────────────

  it('未知 action 不报错且不修改文档', () => {
    const view = createView('unchanged', 0, 0);
    const { action } = buildHook(view);
    expect(() => action('unknown-action')).not.toThrow();
    expect(view.state.doc.toString()).toBe('unchanged');
  });
});

// ── Milkdown (WYSIWYG) mode — routing through bridge ──────────────────────────

/** Build the hook with milkdownPreview=true and a mock active tab doc */
function buildMilkdownHook(doc: string) {
  const cmViewRef = { current: null };
  const mockGetActiveTab = vi.fn(() => ({
    id: '1',
    filePath: '/docs/test.md',
    doc,
    isDirty: false,
  }));
  const mockPromptUser = vi.fn();
  const { result } = renderHook(() =>
    useFormatActions({
      cmViewRef: cmViewRef as any,
      getActiveTab: mockGetActiveTab as any,
      promptUser: mockPromptUser,
      milkdownPreview: true,
    })
  );
  return { action: result.current.handleFormatAction, mockGetActiveTab };
}

describe('useFormatActions — milkdown mode', () => {
  // Save and restore bridge mocks around each test
  let savedToggleList: typeof milkdownBridge.toggleList;
  let savedListLift: typeof milkdownBridge.listLift;
  let savedGetContent: typeof milkdownBridge.getContent;
  let savedForceReplace: typeof milkdownBridge.forceReplaceContent;
  let savedHeadingPromote: typeof milkdownBridge.headingPromote;
  let savedHeadingDemote: typeof milkdownBridge.headingDemote;

  const toggleListSpy = vi.fn();
  const listLiftSpy = vi.fn();
  const forceReplaceSpy = vi.fn();
  const headingPromoteSpy = vi.fn();
  const headingDemoteSpy = vi.fn();

  beforeEach(() => {
    savedToggleList = milkdownBridge.toggleList;
    savedListLift = milkdownBridge.listLift;
    savedGetContent = milkdownBridge.getContent;
    savedForceReplace = milkdownBridge.forceReplaceContent;
    savedHeadingPromote = milkdownBridge.headingPromote;
    savedHeadingDemote = milkdownBridge.headingDemote;

    milkdownBridge.toggleList = toggleListSpy;
    milkdownBridge.listLift = listLiftSpy;
    milkdownBridge.forceReplaceContent = forceReplaceSpy;
    milkdownBridge.headingPromote = headingPromoteSpy;
    milkdownBridge.headingDemote = headingDemoteSpy;
    milkdownBridge.getContent = null; // default: no live content getter
  });

  afterEach(() => {
    milkdownBridge.toggleList = savedToggleList;
    milkdownBridge.listLift = savedListLift;
    milkdownBridge.getContent = savedGetContent;
    milkdownBridge.forceReplaceContent = savedForceReplace;
    milkdownBridge.headingPromote = savedHeadingPromote;
    milkdownBridge.headingDemote = savedHeadingDemote;
    vi.clearAllMocks();
  });

  // ── ul / ol via toggleList ─────────────────────────────────────────────

  it("'ul' action calls milkdownBridge.toggleList('bullet')", () => {
    const { action } = buildMilkdownHook('some text');
    action('ul');
    expect(toggleListSpy).toHaveBeenCalledTimes(1);
    expect(toggleListSpy).toHaveBeenCalledWith('bullet');
  });

  it("'ol' action calls milkdownBridge.toggleList('ordered')", () => {
    const { action } = buildMilkdownHook('some text');
    action('ol');
    expect(toggleListSpy).toHaveBeenCalledTimes(1);
    expect(toggleListSpy).toHaveBeenCalledWith('ordered');
  });

  it("'ul' does NOT call forceReplaceContent", () => {
    const { action } = buildMilkdownHook('some text');
    action('ul');
    expect(forceReplaceSpy).not.toHaveBeenCalled();
  });

  it("'ol' does NOT call forceReplaceContent", () => {
    const { action } = buildMilkdownHook('some text');
    action('ol');
    expect(forceReplaceSpy).not.toHaveBeenCalled();
  });

  // ── list-lift ──────────────────────────────────────────────────────────

  it("'list-lift' action calls milkdownBridge.listLift()", () => {
    const { action } = buildMilkdownHook('- item');
    action('list-lift');
    expect(listLiftSpy).toHaveBeenCalledTimes(1);
  });

  it("'list-lift' does NOT call toggleList", () => {
    const { action } = buildMilkdownHook('- item');
    action('list-lift');
    expect(toggleListSpy).not.toHaveBeenCalled();
  });

  // ── heading-promote / heading-demote ──────────────────────────────────

  it("'heading-promote' calls milkdownBridge.headingPromote()", () => {
    const { action } = buildMilkdownHook('## heading');
    action('heading-promote');
    expect(headingPromoteSpy).toHaveBeenCalledTimes(1);
  });

  it("'heading-demote' calls milkdownBridge.headingDemote()", () => {
    const { action } = buildMilkdownHook('## heading');
    action('heading-demote');
    expect(headingDemoteSpy).toHaveBeenCalledTimes(1);
  });

  // ── renumber-ol ───────────────────────────────────────────────────────

  it("'renumber-ol' reads live content from getContent when available", () => {
    milkdownBridge.getContent = () => '1. a\n3. b\n5. c';
    const { action } = buildMilkdownHook('STALE REACT STATE');
    action('renumber-ol');
    expect(forceReplaceSpy).toHaveBeenCalledTimes(1);
    expect(forceReplaceSpy).toHaveBeenCalledWith('1. a\n2. b\n3. c');
  });

  it("'renumber-ol' falls back to getActiveTab().doc when getContent is null", () => {
    milkdownBridge.getContent = null;
    const { action } = buildMilkdownHook('1. a\n3. b');
    action('renumber-ol');
    expect(forceReplaceSpy).toHaveBeenCalledWith('1. a\n2. b');
  });

  it("'renumber-ol' does not call forceReplaceContent when list is already correct", () => {
    milkdownBridge.getContent = () => '1. a\n2. b\n3. c';
    const { action } = buildMilkdownHook('');
    action('renumber-ol');
    // It still calls forceReplaceContent, but with the same (already-correct) content
    expect(forceReplaceSpy).toHaveBeenCalledWith('1. a\n2. b\n3. c');
  });

  it("'renumber-ol' preserves frontmatter in the output", () => {
    const content = '---\ntitle: test\n---\n\n1. a\n3. b';
    milkdownBridge.getContent = () => content;
    const { action } = buildMilkdownHook('');
    action('renumber-ol');
    const result: string = forceReplaceSpy.mock.calls[0][0];
    expect(result).toContain('title: test');
    expect(result).toContain('1. a');
    expect(result).toContain('2. b');
  });

  // ── Guard: non-milkdown actions still fall through ────────────────────

  it('unknown actions in milkdown mode do not throw', () => {
    const { action } = buildMilkdownHook('');
    expect(() => action('unknown-milkdown-action')).not.toThrow();
  });

  it("'bold' in milkdown mode does not call toggleList (falls through to CM handler)", () => {
    const { action } = buildMilkdownHook('');
    // CodeMirror view is null; action just no-ops without throwing
    expect(() => action('bold')).not.toThrow();
    expect(toggleListSpy).not.toHaveBeenCalled();
  });
});
