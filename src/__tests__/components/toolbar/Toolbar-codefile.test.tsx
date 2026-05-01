import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
        'toolbar.table': '插入表格',
        'toolbar.codeblock': '代码块',
        'toolbar.hr': '分割线',
        'toolbar.task': '任务列表',
        'toolbar.math': '数学公式',
        'toolbar.label': '工具栏',
        'toolbar.insertSnippet': '插入片段',
        'toolbar.undo': '撤销',
        'toolbar.redo': '重做',
        'toolbar.editablePreview': '预览可编辑',
        'toolbar.mindmapMode': '思维导图模式',
        'toolbar.aiCopilotOpen': '打开AI助手',
        'toolbar.aiCopilotClose': '关闭AI助手',
        'file.openFolder': '打开文件夹',
        'about.title': '关于 MarkLite++',
        'toolbar.export': '导出',
      };
      return map[key] ?? key;
    },
  })),
}));

const defaultProps = {
  viewMode: 'edit' as ViewMode,
  focusMode: 'normal' as FocusMode,
  onNewTab: vi.fn(),
  onOpenFile: vi.fn(),
  onSaveFile: vi.fn(),
  onSaveAsFile: vi.fn(),
  onExportDocx: vi.fn(),
  onExportPdf: vi.fn(),
  onExportHtml: vi.fn(),
  onSetViewMode: vi.fn(),
  onFormatAction: vi.fn(),
  onFocusModeChange: vi.fn(),
  spellCheck: false,
  onToggleSpellCheck: vi.fn(),
  vimMode: false,
  onToggleVimMode: vi.fn(),
  onInsertSnippet: vi.fn(),
  canUndo: true,
  canRedo: true,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onToggleWysiwygMode: vi.fn(),
};

describe('Toolbar — code file mode (isCodeFile=true)', () => {
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

  // ── Formatting buttons should be hidden ──

  it('hides markdown formatting buttons (bold/italic/strikethrough/code/heading/quote/lists)', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

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
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

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

  // ── View mode buttons should be hidden ──

  it('hides view mode buttons (edit/split/preview)', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

    expect(screen.queryByTitle('仅编辑')).not.toBeInTheDocument();
    expect(screen.queryByTitle('分栏预览')).not.toBeInTheDocument();
    expect(screen.queryByTitle('仅预览')).not.toBeInTheDocument();
  });

  it('hides mindmap button', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

    expect(screen.queryByTitle('思维导图模式')).not.toBeInTheDocument();
  });

  it('hides WYSIWYG toggle button', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

    expect(screen.queryByTitle('预览可编辑')).not.toBeInTheDocument();
  });

  // ── Buttons that should remain visible ──

  it('shows spellcheck button', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

    expect(screen.getByTitle('开启拼写检查')).toBeInTheDocument();
  });

  it('shows vim mode button', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

    expect(screen.getByTitle('开启Vim模式')).toBeInTheDocument();
  });

  it('shows typewriter, focus, and fullscreen buttons', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

    expect(screen.getByTitle('打字机模式')).toBeInTheDocument();
    expect(screen.getByTitle('焦点模式')).toBeInTheDocument();
    expect(screen.getByTitle('全屏')).toBeInTheDocument();
  });

  it('shows undo and redo buttons', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} />);

    expect(screen.getByTitle('撤销')).toBeInTheDocument();
    expect(screen.getByTitle('重做')).toBeInTheDocument();
  });

  it('shows file operation buttons (new/open/save/saveAs)', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} onOpenFolder={vi.fn()} />);

    expect(screen.getByTitle('新建')).toBeInTheDocument();
    expect(screen.getByTitle('打开')).toBeInTheDocument();
    expect(screen.getByTitle('打开文件夹')).toBeInTheDocument();
    expect(screen.getByTitle('保存')).toBeInTheDocument();
    expect(screen.getByTitle('另存为')).toBeInTheDocument();
  });
});

describe('Toolbar — code file + wysiwygMode=true (edge case)', () => {
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

  it('shows spellcheck and vim mode buttons even when wysiwygMode is true', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} wysiwygMode={true} />);

    expect(screen.getByTitle('开启拼写检查')).toBeInTheDocument();
    expect(screen.getByTitle('开启Vim模式')).toBeInTheDocument();
  });

  it('shows typewriter, focus, and fullscreen buttons even when wysiwygMode is true', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} wysiwygMode={true} />);

    expect(screen.getByTitle('打字机模式')).toBeInTheDocument();
    expect(screen.getByTitle('焦点模式')).toBeInTheDocument();
    expect(screen.getByTitle('全屏')).toBeInTheDocument();
  });

  it('still hides view mode and mindmap buttons', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} wysiwygMode={true} />);

    expect(screen.queryByTitle('仅编辑')).not.toBeInTheDocument();
    expect(screen.queryByTitle('分栏预览')).not.toBeInTheDocument();
    expect(screen.queryByTitle('仅预览')).not.toBeInTheDocument();
    expect(screen.queryByTitle('思维导图模式')).not.toBeInTheDocument();
  });

  it('still hides WYSIWYG toggle', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} wysiwygMode={true} />);

    expect(screen.queryByTitle('预览可编辑')).not.toBeInTheDocument();
  });

  it('still hides formatting buttons', () => {
    render(<Toolbar {...defaultProps} isCodeFile={true} wysiwygMode={true} />);

    expect(screen.queryByTitle('粗体')).not.toBeInTheDocument();
    expect(screen.queryByTitle('斜体')).not.toBeInTheDocument();
    expect(screen.queryByTitle('标题')).not.toBeInTheDocument();
  });
});
