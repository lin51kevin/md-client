import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../../components/toolbar/Toolbar';
import type { ViewMode, FocusMode } from '../../../types';

vi.mock('../../../i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'file.new': '新建',
        'file.open': '打开',
        'file.save': '保存',
        'file.saveAs': '另存为',
        'toolbar.bold': '粗体',
        'toolbar.italic': '斜体',
        'toolbar.strikethrough': '删除线',
        'toolbar.code': '行内代码',
        'toolbar.heading': '标题',
        'toolbar.blockquote': '引用',
        'toolbar.ul': '无序列表',
        'toolbar.ol': '有序列表',
        'toolbar.link': '链接',
        'toolbar.imageLocal': '插入本地图片',
        'toolbar.imageLink': '插入图片链接',
        'toolbar.spellCheckOff': '关闭拼写检查',
        'toolbar.spellCheckOn': '开启拼写检查',
        'toolbar.vimModeOff': '关闭Vim模式',
        'toolbar.vimModeOn': '开启Vim模式',
        'toolbar.typewriter': '打字机模式',
        'toolbar.focus': '焦点模式',
        'toolbar.fullscreen': '全屏',
        'toolbar.editOnly': '仅编辑',
        'toolbar.split': '分栏预览',
        'toolbar.previewOnly': '仅预览',
        'about.title': '关于 MarkLite',
        'toolbar.prevTab': '上一个标签页',
        'toolbar.nextTab': '下一个标签页',
        'toolbar.table': '插入表格',
        'toolbar.codeblock': '代码块',
        'toolbar.hr': '分割线',
        'toolbar.task': '任务列表',
        'toolbar.math': '数学公式',
        'toolbar.label': '工具栏',
        'toolbar.insertSnippet': '插入片段',
        'toolbar.undo': '撤销',
        'toolbar.redo': '重做',
        'toolbar.aiCopilotOpen': '打开AI助手',
        'toolbar.aiCopilotClose': '关闭AI助手',
        'file.openFolder': '打开文件夹',
        'toolbar.slideMode': '幻灯片模式',
        'toolbar.mindmapMode': '思维导图模式',
      };
      return map[key] ?? key;
    },
  })),
}));

const defaultProps = {
  viewMode: 'split' as ViewMode,
  focusMode: 'normal' as FocusMode,
  onNewTab: vi.fn(),
  onOpenFile: vi.fn(),
  onSaveFile: vi.fn(),
  onSaveAsFile: vi.fn(),
  onExportDocx: vi.fn(),
  onExportPdf: vi.fn(),
  onExportHtml: vi.fn(),
  onSetViewMode: vi.fn(),
};

describe('Toolbar — WYSIWYG mode (wysiwygMode=true)', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 32,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 32,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 视图切换按钮应该隐藏 ──

  it('hides view mode switcher buttons (edit/split/preview/slide/mindmap)', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} />);

    expect(screen.queryByTitle('仅编辑')).not.toBeInTheDocument();
    expect(screen.queryByTitle('分栏预览')).not.toBeInTheDocument();
    expect(screen.queryByTitle('仅预览')).not.toBeInTheDocument();
    expect(screen.queryByTitle('幻灯片模式')).not.toBeInTheDocument();
    expect(screen.queryByTitle('思维导图模式')).not.toBeInTheDocument();
  });

  // ── 格式化按钮应该隐藏 ──

  it('hides all formatting buttons (bold/italic/strikethrough/code/heading/quote/lists)', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} onFormatAction={vi.fn()} />);

    expect(screen.queryByTitle('粗体')).not.toBeInTheDocument();
    expect(screen.queryByTitle('斜体')).not.toBeInTheDocument();
    expect(screen.queryByTitle('删除线')).not.toBeInTheDocument();
    expect(screen.queryByTitle('行内代码')).not.toBeInTheDocument();
    expect(screen.queryByTitle('标题')).not.toBeInTheDocument();
    expect(screen.queryByTitle('引用')).not.toBeInTheDocument();
    expect(screen.queryByTitle('无序列表')).not.toBeInTheDocument();
    expect(screen.queryByTitle('有序列表')).not.toBeInTheDocument();
  });

  it('hides link/image/table/codeblock/hr/task/math/snippet buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} onFormatAction={vi.fn()} onInsertSnippet={vi.fn()} />);

    expect(screen.queryByTitle('链接')).not.toBeInTheDocument();
    expect(screen.queryByTitle('插入本地图片')).not.toBeInTheDocument();
    expect(screen.queryByTitle('插入图片链接')).not.toBeInTheDocument();
    expect(screen.queryByTitle('插入表格')).not.toBeInTheDocument();
    expect(screen.queryByTitle('代码块')).not.toBeInTheDocument();
    expect(screen.queryByTitle('分割线')).not.toBeInTheDocument();
    expect(screen.queryByTitle('任务列表')).not.toBeInTheDocument();
    expect(screen.queryByTitle('数学公式')).not.toBeInTheDocument();
    expect(screen.queryByTitle('插入片段')).not.toBeInTheDocument();
  });

  // ── Undo/Redo 应该隐藏 ──

  it('hides undo and redo buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} canUndo canRedo onUndo={vi.fn()} onRedo={vi.fn()} />);

    expect(screen.queryByTitle('撤销')).not.toBeInTheDocument();
    expect(screen.queryByTitle('重做')).not.toBeInTheDocument();
  });

  // ── 代码相关按钮应该隐藏 ──

  it('hides spell check and vim mode buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} spellCheck={false} onToggleSpellCheck={vi.fn()} vimMode={false} onToggleVimMode={vi.fn()} />);

    expect(screen.queryByTitle('开启拼写检查')).not.toBeInTheDocument();
    expect(screen.queryByTitle('关闭拼写检查')).not.toBeInTheDocument();
    expect(screen.queryByTitle('开启Vim模式')).not.toBeInTheDocument();
    expect(screen.queryByTitle('关闭Vim模式')).not.toBeInTheDocument();
  });

  // ── 焦点/打字机/全屏 应该隐藏 ──

  it('hides typewriter, focus, and fullscreen buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} onFocusModeChange={vi.fn()} />);

    expect(screen.queryByTitle('打字机模式')).not.toBeInTheDocument();
    expect(screen.queryByTitle('焦点模式')).not.toBeInTheDocument();
    expect(screen.queryByTitle('全屏')).not.toBeInTheDocument();
  });

  // ── 文件操作按钮应该保留 ──

  it('keeps file operation buttons (new/open/folder/save/saveAs)', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} onOpenFolder={vi.fn()} />);

    expect(screen.getByTitle('新建')).toBeInTheDocument();
    expect(screen.getByTitle('打开')).toBeInTheDocument();
    expect(screen.getByTitle('打开文件夹')).toBeInTheDocument();
    expect(screen.getByTitle('保存')).toBeInTheDocument();
    expect(screen.getByTitle('另存为')).toBeInTheDocument();
  });

  // ── 帮助/关于 应该保留 ──

  it('keeps about button', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={true} onOpenAbout={vi.fn()} />);

    expect(screen.getByTitle('关于 MarkLite')).toBeInTheDocument();
  });

  // ── AI Copilot 应该保留 ──

  it('keeps AI Copilot button when enabled', () => {
    render(
      <Toolbar
        {...defaultProps}
        wysiwygMode={true}
        aiCopilotEnabled={true}
        showAIPanel={false}
        onToggleAIPanel={vi.fn()}
      />
    );

    expect(screen.getByTitle('打开AI助手')).toBeInTheDocument();
  });
});

describe('Toolbar — normal mode (wysiwygMode=false, default)', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 32,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 32,
    });
  });

  it('shows all view mode buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={false} />);

    expect(screen.getByTitle('仅编辑')).toBeInTheDocument();
    expect(screen.getByTitle('分栏预览')).toBeInTheDocument();
    expect(screen.getByTitle('仅预览')).toBeInTheDocument();
  });

  it('shows formatting buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={false} onFormatAction={vi.fn()} />);

    expect(screen.getByTitle('粗体')).toBeInTheDocument();
    expect(screen.getByTitle('斜体')).toBeInTheDocument();
    expect(screen.getByTitle('标题')).toBeInTheDocument();
  });

  it('shows undo/redo buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={false} canUndo canRedo onUndo={vi.fn()} onRedo={vi.fn()} />);

    expect(screen.getByTitle('撤销')).toBeInTheDocument();
    expect(screen.getByTitle('重做')).toBeInTheDocument();
  });

  it('shows spell check and vim mode buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={false} spellCheck={false} onToggleSpellCheck={vi.fn()} vimMode={false} onToggleVimMode={vi.fn()} />);

    expect(screen.getByTitle('开启拼写检查')).toBeInTheDocument();
    expect(screen.getByTitle('开启Vim模式')).toBeInTheDocument();
  });

  it('shows focus mode buttons', () => {
    render(<Toolbar {...defaultProps} wysiwygMode={false} onFocusModeChange={vi.fn()} />);

    expect(screen.getByTitle('打字机模式')).toBeInTheDocument();
    expect(screen.getByTitle('焦点模式')).toBeInTheDocument();
    expect(screen.getByTitle('全屏')).toBeInTheDocument();
  });
});
