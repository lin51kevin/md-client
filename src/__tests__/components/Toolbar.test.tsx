import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../components/Toolbar';
import type { ViewMode, FocusMode } from '../../types';

// Mock i18n hook to return Chinese labels
vi.mock('../../i18n', () => ({
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
        'toolbar.prevTab': '上一个标签页',
        'toolbar.nextTab': '下一个标签页',
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
    expect(screen.getByTitle('搜索与替换')).toBeInTheDocument();
    expect(screen.getByTitle('设置')).toBeInTheDocument();
    expect(screen.getByTitle('帮助')).toBeInTheDocument();
  });

  it('search toggle button calls onToggleSearch', () => {
    const onToggleSearch = vi.fn();
    render(<Toolbar {...defaultProps} onToggleSearch={onToggleSearch} showSearch={false} />);
    screen.getByTitle('搜索与替换').click();
    expect(onToggleSearch).toHaveBeenCalledTimes(1);
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
    const helpButton = screen.getByTitle('帮助');
    toolbar.focus();

    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(helpButton);
  });

  it('toolbar 自身聚焦时按 ArrowRight 应跳到第一个按钮', () => {
    render(<Toolbar {...defaultProps} />);

    const toolbar = screen.getByRole('toolbar');
    const [firstButton] = screen.getAllByRole('button');
    toolbar.focus();

    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(firstButton);
  });
});
