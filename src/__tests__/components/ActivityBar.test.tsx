import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityBar, PANEL_ITEMS, type PanelId } from '../../components/ActivityBar';

vi.mock('../../i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'toolbar.fileTree': '文件树',
        'toolbar.search': '搜索与替换',
        'toolbar.toc': '大纲导航',
        'git.panel': 'Source Control',
        'settings.title': '设置',
      };
      return map[key] ?? key;
    },
  })),
}));

describe('ActivityBar', () => {
  const defaultProps = {
    activePanel: null as PanelId | null,
    onPanelChange: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('应渲染 4 个面板图标按钮 + 1 个底部设置按钮', () => {
    render(<ActivityBar {...defaultProps} />);
    // 4 panel buttons + 1 settings button = 5 total
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(5);
  });

  it('应渲染文件树、搜索、大纲、Git 图标', () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.getByTitle('文件树')).toBeInTheDocument();
    expect(screen.getByTitle('搜索与替换')).toBeInTheDocument();
    expect(screen.getByTitle('大纲导航')).toBeInTheDocument();
    expect(screen.getByTitle('Source Control')).toBeInTheDocument();
  });

  it('应渲染底部设置按钮', () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.getByTitle('设置')).toBeInTheDocument();
  });

  it('点击文件树图标应调用 onPanelChange("filetree")', () => {
    render(<ActivityBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('文件树'));
    expect(defaultProps.onPanelChange).toHaveBeenCalledWith('filetree');
  });

  it('点击搜索图标应调用 onPanelChange("search")', () => {
    render(<ActivityBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('搜索与替换'));
    expect(defaultProps.onPanelChange).toHaveBeenCalledWith('search');
  });

  it('点击大纲图标应调用 onPanelChange("toc")', () => {
    render(<ActivityBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('大纲导航'));
    expect(defaultProps.onPanelChange).toHaveBeenCalledWith('toc');
  });

  it('点击 Git 图标应调用 onPanelChange("git")', () => {
    render(<ActivityBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Source Control'));
    expect(defaultProps.onPanelChange).toHaveBeenCalledWith('git');
  });

  it('再次点击已激活面板图标应调用 onPanelChange(null)（关闭）', () => {
    render(<ActivityBar {...defaultProps} activePanel="filetree" />);
    fireEvent.click(screen.getByTitle('文件树'));
    expect(defaultProps.onPanelChange).toHaveBeenCalledWith(null);
  });

  it('activePanel 图标应有 active 样式（accent border）', () => {
    render(<ActivityBar {...defaultProps} activePanel="search" />);
    const searchBtn = screen.getByTitle('搜索与替换');
    expect(searchBtn.style.borderLeft).toContain('var(--accent-color)');
  });

  it('非 active 图标应无 accent border', () => {
    render(<ActivityBar {...defaultProps} activePanel="search" />);
    const fileTreeBtn = screen.getByTitle('文件树');
    expect(fileTreeBtn.style.borderLeft).not.toContain('var(--accent-color)');
  });

  it('点击设置按钮应调用 onOpenSettings', () => {
    render(<ActivityBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('设置'));
    expect(defaultProps.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('设置按钮不应触发面板切换', () => {
    render(<ActivityBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('设置'));
    expect(defaultProps.onPanelChange).not.toHaveBeenCalled();
  });

  describe('鼠标拖拽重排', () => {
    it('面板按钮应无 draggable 属性（使用鼠标事件替代 HTML5 DnD）', () => {
      render(<ActivityBar {...defaultProps} />);
      const fileTreeBtn = screen.getByTitle('文件树');
      expect(fileTreeBtn).not.toHaveAttribute('draggable', 'true');
    });

    it('mousedown + mousemove(>4px) + mouseup 应重排：index 0 → index 1', () => {
      render(<ActivityBar {...defaultProps} />);
      const buttons = screen.getAllByRole('button').slice(0, 4);

      // 初始：filetree(0), toc(1), search(2), git(3)
      expect(buttons[0]).toHaveAttribute('title', '文件树');

      // 拖第 0 项下移到 slot=1 (clientY=50, ITEM_HEIGHT=40, floor(50/40)=1)
      fireEvent.mouseDown(buttons[0], { button: 0, clientY: 0 });
      fireEvent.mouseMove(window, { clientY: 50 });
      fireEvent.mouseUp(window, { clientY: 50 });

      const updated = screen.getAllByRole('button').slice(0, 4);
      // reorder([filetree,toc,search,git], 0→1) = [toc, filetree, search, git]
      expect(updated[0]).toHaveAttribute('title', '大纲导航');
      expect(updated[1]).toHaveAttribute('title', '文件树');
    });

    it('移动距离不足阈值（≤4px）应视为点击，不重排', () => {
      const onPanelChange = vi.fn();
      render(<ActivityBar {...defaultProps} onPanelChange={onPanelChange} />);
      const buttons = screen.getAllByRole('button').slice(0, 4);
      const originalOrder = buttons.map(b => b.getAttribute('title'));

      fireEvent.mouseDown(buttons[0], { button: 0, clientY: 0 });
      fireEvent.mouseMove(window, { clientY: 2 }); // < DRAG_THRESHOLD=4
      fireEvent.mouseUp(window, { clientY: 2 });
      // Click fires naturally → onPanelChange called
      fireEvent.click(buttons[0]);

      expect(onPanelChange).toHaveBeenCalledWith('filetree');
      const after = screen.getAllByRole('button').slice(0, 4);
      expect(after.map(b => b.getAttribute('title'))).toEqual(originalOrder);
    });

    it('拖拽后顺序应持久化到 localStorage', () => {
      render(<ActivityBar {...defaultProps} />);
      const buttons = screen.getAllByRole('button').slice(0, 4);

      fireEvent.mouseDown(buttons[0], { button: 0, clientY: 0 });
      fireEvent.mouseMove(window, { clientY: 50 });
      fireEvent.mouseUp(window, { clientY: 50 });

      const saved = localStorage.getItem('marklite-panel-order');
      expect(saved).not.toBeNull();
      expect(saved).not.toBe('filetree,toc,search,git');
      expect(saved).toContain('filetree');
    });

    it('已保存的顺序重启后应恢复', () => {
      localStorage.setItem('marklite-panel-order', 'git,toc,search,filetree');
      render(<ActivityBar {...defaultProps} />);

      const buttons = screen.getAllByRole('button').slice(0, 4);
      expect(buttons[0]).toHaveAttribute('title', 'Source Control');
      expect(buttons[1]).toHaveAttribute('title', '大纲导航');
      expect(buttons[2]).toHaveAttribute('title', '搜索与替换');
      expect(buttons[3]).toHaveAttribute('title', '文件树');
    });

    it('PANEL_ITEMS 导出应包含 4 个面板', () => {
      expect(PANEL_ITEMS).toHaveLength(4);
      const ids = PANEL_ITEMS.map(p => p.id);
      expect(ids).toContain('filetree');
      expect(ids).toContain('search');
      expect(ids).toContain('toc');
      expect(ids).toContain('git');
    });
  });
});

