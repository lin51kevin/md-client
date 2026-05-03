import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../../components/toolbar/Toolbar';
import type { ViewMode, FocusMode } from '../../../types';

// Mock vim-bridge so isVimAvailable() returns true
vi.mock('../../../lib/cm/vim-bridge', () => ({
  isVimAvailable: () => true,
  getVimExtension: () => ({}),
  registerVimExtension: vi.fn(),
  unregisterVimExtension: vi.fn(),
}));

// Mock i18n hook to return Chinese labels
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
        'toolbar.fileTree': '文件树',
        'toolbar.toc': '大纲',
        'toolbar.spellCheckOff': '关闭拼写检查',
        'toolbar.spellCheckOn': '开启拼写检查',
        'toolbar.vimModeOff': '关闭Vim模式',
        'toolbar.vimModeOn': '开启Vim模式',
        'toolbar.search': '搜索与替换',
        'toolbar.typewriter': '打字机模式',
        'toolbar.focus': '焦点模式',
        'toolbar.fullscreen': '全屏',
        'toolbar.editOnly': '仅编辑',
        'toolbar.split': '分栏预览',
        'toolbar.previewOnly': '仅预览',
        'settings.title': '设置',
        'help.title': '帮助',
        'about.title': '关于 MarkLite++',
        'toolbar.prevTab': '上一个标签页',
        'toolbar.nextTab': '下一个标签页',
        'toolbar.table': '插入表格',
        'toolbar.codeblock': '代码块',
        'toolbar.hr': '分割线',
        'toolbar.task': '任务列表',
        'toolbar.math': '数学公式',
        'toolbar.label': '工具栏',
        'toolbar.insertSnippet': '插入片段',
        'toolbar.export': '导出',
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

describe('Toolbar', () => {
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

  it('renders all main operation buttons', () => {
    render(<Toolbar {...defaultProps} />);
    // File ops (new, open, save, save-as) are icon buttons
    const btns = screen.getAllByRole('button');
    // Should have many buttons: file menu + new/open/save/saveAs + format + right toggles
    expect(btns.length).toBeGreaterThan(15);
  });

  it('calls onSaveFile when save button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    screen.getByTitle('保存').click();
    expect(defaultProps.onSaveFile).toHaveBeenCalledTimes(1);
  });

  it('calls onSetViewMode with correct mode for each view button', () => {
    render(<Toolbar {...defaultProps} />);

    screen.getByTitle('仅编辑').click();
    expect(defaultProps.onSetViewMode).toHaveBeenCalledWith('edit');

    screen.getByTitle('分栏预览').click();
    expect(defaultProps.onSetViewMode).toHaveBeenCalledWith('split');

    screen.getByTitle('仅预览').click();
    expect(defaultProps.onSetViewMode).toHaveBeenCalledWith('preview');
  });

  it('buttons have correct title attributes (Chinese i18n)', () => {
    render(<Toolbar {...defaultProps} />);

    expect(screen.getByTitle('新建')).toBeInTheDocument();
    expect(screen.getByTitle('打开')).toBeInTheDocument();
    expect(screen.getByTitle('保存')).toBeInTheDocument();
    expect(screen.getByTitle('另存为')).toBeInTheDocument();
    expect(screen.getByTitle('粗体')).toBeInTheDocument();
    expect(screen.getByTitle('关于 MarkLite++')).toBeInTheDocument();
  });

  it('displays Chinese labels by default (i18n zh-CN)', () => {
    render(<Toolbar {...defaultProps} />);
    // Title attributes verify Chinese labels
    expect(screen.getByTitle('新建').title).toBe('新建');
    expect(screen.getByTitle('保存').title).toBe('保存');
  });

  it('toolbar 自身聚焦时按 ArrowLeft 应跳到最后一个按钮', () => {
    render(<Toolbar {...defaultProps} />);

    const toolbar = screen.getByRole('toolbar');
    const aboutButton = screen.getByTitle('关于 MarkLite++');
    toolbar.focus();

    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(aboutButton);
  });

  it('toolbar 自身聚焦时按 ArrowRight 应跳到第一个按钮', () => {
    render(<Toolbar {...defaultProps} />);

    const toolbar = screen.getByRole('toolbar');
    const [firstButton] = screen.getAllByRole('button');
    toolbar.focus();

    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(firstButton);
  });

  it('calls onFormatAction("bold") when bold button is clicked', () => {
    const onFormatAction = vi.fn();
    render(<Toolbar {...defaultProps} onFormatAction={onFormatAction} />);
    screen.getByTitle('粗体').click();
    expect(onFormatAction).toHaveBeenCalledWith('bold');
  });

  it('calls correct onFormatAction for all inline format buttons', () => {
    const onFormatAction = vi.fn();
    render(<Toolbar {...defaultProps} onFormatAction={onFormatAction} />);

    screen.getByTitle('斜体').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('italic');

    screen.getByTitle('删除线').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('strikethrough');

    screen.getByTitle('行内代码').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('code');
  });

  it('calls correct onFormatAction for block element buttons', () => {
    const onFormatAction = vi.fn();
    render(<Toolbar {...defaultProps} onFormatAction={onFormatAction} />);

    screen.getByTitle('标题').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('heading');

    screen.getByTitle('引用').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('blockquote');

    screen.getByTitle('无序列表').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('ul');

    screen.getByTitle('有序列表').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('ol');
  });

  it('calls correct onFormatAction for link/image buttons', () => {
    const onFormatAction = vi.fn();
    render(<Toolbar {...defaultProps} onFormatAction={onFormatAction} />);

    screen.getByTitle('链接').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('link');

    screen.getByTitle('插入图片链接').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('image-link');
  });

  it('calls correct onFormatAction for extra buttons (codeblock, hr, task, math)', () => {
    const onFormatAction = vi.fn();
    render(<Toolbar {...defaultProps} onFormatAction={onFormatAction} />);

    screen.getByTitle('代码块').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('codeblock');

    screen.getByTitle('分割线').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('hr');

    screen.getByTitle('任务列表').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('task');

    screen.getByTitle('数学公式').click();
    expect(onFormatAction).toHaveBeenLastCalledWith('math');
  });

  it('calls onImageLocal when image local button is clicked', () => {
    const onImageLocal = vi.fn();
    render(<Toolbar {...defaultProps} onImageLocal={onImageLocal} />);
    screen.getByTitle('插入本地图片').click();
    expect(onImageLocal).toHaveBeenCalledTimes(1);
  });

  it('shows table size picker when table button is clicked', () => {
    const onFormatAction = vi.fn();
    const { container } = render(<Toolbar {...defaultProps} onFormatAction={onFormatAction} />);
    fireEvent.click(screen.getByTitle('插入表格'));
    // TableSizePicker renders a grid of divs inside an absolute container
    const picker = container.querySelector('.absolute.z-50');
    expect(picker).toBeInTheDocument();
  });

  it('hides table size picker on second click of table button', () => {
    const onFormatAction = vi.fn();
    const { container } = render(<Toolbar {...defaultProps} onFormatAction={onFormatAction} />);
    const tableBtn = screen.getByTitle('插入表格');
    fireEvent.click(tableBtn);
    fireEvent.click(tableBtn);
    const picker = container.querySelector('.absolute.z-50');
    expect(picker).not.toBeInTheDocument();
  });


  it('shows "开启拼写检查" title when spellCheck is false', () => {
    render(<Toolbar {...defaultProps} spellCheck={false} />);
    expect(screen.getByTitle('开启拼写检查')).toBeInTheDocument();
  });

  it('shows "关闭拼写检查" title when spellCheck is true', () => {
    render(<Toolbar {...defaultProps} spellCheck={true} />);
    expect(screen.getByTitle('关闭拼写检查')).toBeInTheDocument();
  });

  it('calls onToggleSpellCheck when spell check button is clicked', () => {
    const onToggleSpellCheck = vi.fn();
    render(<Toolbar {...defaultProps} spellCheck={false} onToggleSpellCheck={onToggleSpellCheck} />);
    screen.getByTitle('开启拼写检查').click();
    expect(onToggleSpellCheck).toHaveBeenCalledTimes(1);
  });

  it('shows "开启Vim模式" title when vimMode is false', () => {
    render(<Toolbar {...defaultProps} vimMode={false} />);
    expect(screen.getByTitle('开启Vim模式')).toBeInTheDocument();
  });

  it('shows "关闭Vim模式" title when vimMode is true', () => {
    render(<Toolbar {...defaultProps} vimMode={true} />);
    expect(screen.getByTitle('关闭Vim模式')).toBeInTheDocument();
  });

  it('calls onToggleVimMode when vim mode button is clicked', () => {
    const onToggleVimMode = vi.fn();
    render(<Toolbar {...defaultProps} vimMode={false} onToggleVimMode={onToggleVimMode} />);
    screen.getByTitle('开启Vim模式').click();
    expect(onToggleVimMode).toHaveBeenCalledTimes(1);
  });

  it('calls onFocusModeChange("typewriter") when typewriter button is clicked', () => {
    const onFocusModeChange = vi.fn();
    render(<Toolbar {...defaultProps} onFocusModeChange={onFocusModeChange} />);
    screen.getByTitle('打字机模式').click();
    expect(onFocusModeChange).toHaveBeenCalledWith('typewriter');
  });

  it('calls onFocusModeChange("focus") when focus mode button is clicked', () => {
    const onFocusModeChange = vi.fn();
    render(<Toolbar {...defaultProps} onFocusModeChange={onFocusModeChange} />);
    screen.getByTitle('焦点模式').click();
    expect(onFocusModeChange).toHaveBeenCalledWith('focus');
  });

  it('calls onFocusModeChange("fullscreen") when fullscreen is not active', () => {
    const onFocusModeChange = vi.fn();
    render(<Toolbar {...defaultProps} focusMode="normal" onFocusModeChange={onFocusModeChange} />);
    screen.getByTitle('全屏').click();
    expect(onFocusModeChange).toHaveBeenCalledWith('fullscreen');
  });

  it('calls onFocusModeChange("normal") when already in fullscreen mode', () => {
    const onFocusModeChange = vi.fn();
    render(<Toolbar {...defaultProps} focusMode="fullscreen" onFocusModeChange={onFocusModeChange} />);
    screen.getByTitle('全屏').click();
    expect(onFocusModeChange).toHaveBeenCalledWith('normal');
  });

  it('calls onOpenAbout when about button is clicked', () => {
    const onOpenAbout = vi.fn();
    render(<Toolbar {...defaultProps} onOpenAbout={onOpenAbout} />);
    screen.getByTitle('关于 MarkLite++').click();
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });

  it('does not show tab navigation buttons when fewer than 2 tabs', () => {
    render(<Toolbar {...defaultProps} tabs={[]} />);
    expect(screen.queryByTitle('上一个标签页')).not.toBeInTheDocument();
    expect(screen.queryByTitle('下一个标签页')).not.toBeInTheDocument();
  });

  it('shows tab navigation buttons when 2+ tabs are provided', () => {
    const tabs: import('../../types').Tab[] = [
      { id: '1', filePath: '/a.md', doc: '', isDirty: false },
      { id: '2', filePath: '/b.md', doc: '', isDirty: false },
    ];
    render(<Toolbar {...defaultProps} tabs={tabs} activeTabId="1" />);
    expect(screen.getByTitle('上一个标签页')).toBeInTheDocument();
    expect(screen.getByTitle('下一个标签页')).toBeInTheDocument();
  });

  it('prevTab button is disabled on first tab', () => {
    const tabs: import('../../types').Tab[] = [
      { id: '1', filePath: '/a.md', doc: '', isDirty: false },
      { id: '2', filePath: '/b.md', doc: '', isDirty: false },
    ];
    render(<Toolbar {...defaultProps} tabs={tabs} activeTabId="1" onActivateTab={vi.fn()} />);
    expect(screen.getByTitle('上一个标签页')).toBeDisabled();
  });

  it('nextTab button is disabled on last tab', () => {
    const tabs: import('../../types').Tab[] = [
      { id: '1', filePath: '/a.md', doc: '', isDirty: false },
      { id: '2', filePath: '/b.md', doc: '', isDirty: false },
    ];
    render(<Toolbar {...defaultProps} tabs={tabs} activeTabId="2" onActivateTab={vi.fn()} />);
    expect(screen.getByTitle('下一个标签页')).toBeDisabled();
  });

  it('nextTab button calls onActivateTab with the next tab id', () => {
    const onActivateTab = vi.fn();
    const tabs: import('../../types').Tab[] = [
      { id: '1', filePath: '/a.md', doc: '', isDirty: false },
      { id: '2', filePath: '/b.md', doc: '', isDirty: false },
    ];
    render(<Toolbar {...defaultProps} tabs={tabs} activeTabId="1" onActivateTab={onActivateTab} />);
    fireEvent.click(screen.getByTitle('下一个标签页'));
    expect(onActivateTab).toHaveBeenCalledWith('2');
  });

  it('ArrowLeft from a middle button moves focus to the previous button', () => {
    render(<Toolbar {...defaultProps} />);
    const toolbar = screen.getByRole('toolbar');
    const buttons = screen.getAllByRole('button');
    buttons[1].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('ArrowRight from a middle button moves focus to the next button', () => {
    render(<Toolbar {...defaultProps} />);
    const toolbar = screen.getByRole('toolbar');
    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('non-arrow keys do not trigger keyboard navigation', () => {
    render(<Toolbar {...defaultProps} />);
    const toolbar = screen.getByRole('toolbar');
    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: 'Enter' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  describe('Export Dropdown Button', () => {
    it('renders the export button', () => {
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByTitle('导出')).toBeInTheDocument();
    });

    it('shows export dropdown when export button is clicked', () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByTitle('导出'));
      expect(screen.getByText('Word (.docx)')).toBeInTheDocument();
      expect(screen.getByText('PDF (.pdf)')).toBeInTheDocument();
      expect(screen.getByText('HTML (.html)')).toBeInTheDocument();
    });

    it('calls onExportDocx when Word option is clicked', () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByTitle('导出'));
      fireEvent.click(screen.getByText('Word (.docx)'));
      expect(defaultProps.onExportDocx).toHaveBeenCalledTimes(1);
    });

    it('calls onExportPdf when PDF option is clicked', () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByTitle('导出'));
      fireEvent.click(screen.getByText('PDF (.pdf)'));
      expect(defaultProps.onExportPdf).toHaveBeenCalledTimes(1);
    });

    it('calls onExportHtml when HTML option is clicked', () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByTitle('导出'));
      fireEvent.click(screen.getByText('HTML (.html)'));
      expect(defaultProps.onExportHtml).toHaveBeenCalledTimes(1);
    });

    it('shows EPUB option when onExportEpub is provided', () => {
      const onExportEpub = vi.fn();
      render(<Toolbar {...defaultProps} onExportEpub={onExportEpub} />);
      fireEvent.click(screen.getByTitle('导出'));
      expect(screen.getByText('EPUB (.epub)')).toBeInTheDocument();
    });

    it('hides EPUB option when onExportEpub is not provided', () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByTitle('导出'));
      expect(screen.queryByText('EPUB (.epub)')).not.toBeInTheDocument();
    });

    it('shows PNG option when onExportPng is provided', () => {
      const onExportPng = vi.fn();
      render(<Toolbar {...defaultProps} onExportPng={onExportPng} />);
      fireEvent.click(screen.getByTitle('导出'));
      expect(screen.getByText('PNG (.png)')).toBeInTheDocument();
    });

    it('hides PNG option when onExportPng is not provided', () => {
      render(<Toolbar {...defaultProps} />);
      fireEvent.click(screen.getByTitle('导出'));
      expect(screen.queryByText('PNG (.png)')).not.toBeInTheDocument();
    });

    it('export button is visible in WYSIWYG mode', () => {
      render(<Toolbar {...defaultProps} wysiwygMode={true} />);
      expect(screen.getByTitle('导出')).toBeInTheDocument();
    });
  });

  describe('Insert Snippet Button', () => {
    it('renders the insert snippet button with correct i18n title', () => {
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByTitle('插入片段')).toBeInTheDocument();
    });

    it('calls onInsertSnippet when snippet button is clicked', () => {
      const onInsertSnippet = vi.fn();
      render(<Toolbar {...defaultProps} onInsertSnippet={onInsertSnippet} />);
      screen.getByTitle('插入片段').click();
      expect(onInsertSnippet).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onInsertSnippet is not provided', () => {
      render(<Toolbar {...defaultProps} />);
      expect(() => screen.getByTitle('插入片段').click()).not.toThrow();
    });

    it('snippet button appears directly after the math (Sigma) button', () => {
      render(<Toolbar {...defaultProps} onInsertSnippet={vi.fn()} />);
      const mathBtn = screen.getByTitle('数学公式');
      const snippetBtn = screen.getByTitle('插入片段');
      const allButtons = screen.getAllByRole('button');
      const mathIdx = allButtons.indexOf(mathBtn);
      const snippetIdx = allButtons.indexOf(snippetBtn);
      expect(snippetIdx).toBe(mathIdx + 1);
    });
  });
});
