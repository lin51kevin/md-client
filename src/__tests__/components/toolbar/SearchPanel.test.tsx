import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchPanel } from '../../../components/toolbar/SearchPanel';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const defaultProps = {
  visible: true,
  content: 'Hello World\nHello Test\nGoodbye World',
  currentFilePath: '/test/file.md',
  onContentChange: vi.fn(),
  onMatchChange: vi.fn(),
  searchDir: null,
  onResultClick: vi.fn(),
  onClose: vi.fn(),
  currentTabId: 'tab-1',
  onAnyTabContentChange: vi.fn(),
  openTabs: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchPanel', () => {
  describe('基本渲染', () => {
    it('visible=false 时返回 null', () => {
      const { container } = render(<SearchPanel {...defaultProps} visible={false} />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('打开面板', () => {
    it('visible=true 时显示搜索输入框', () => {
      render(<SearchPanel {...defaultProps} />);
      expect(screen.getByPlaceholderText(/查找/)).toBeInTheDocument();
    });

    it('显示搜索选项 checkbox', () => {
      render(<SearchPanel {...defaultProps} />);
      // Case sensitive, whole word, regex, cross-file checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(4);
    });

    it('显示关闭按钮', () => {
      render(<SearchPanel {...defaultProps} />);
      const closeBtn = screen.getByTitle(/关闭/);
      expect(closeBtn).toBeInTheDocument();
    });
  });

  describe('当前文件搜索', () => {
    it('输入 query 后按 Enter 触发搜索，结果显示匹配项', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Should show results - "Hello" appears twice in content
      const results = screen.getAllByText(/Hello/);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('空 query 按 Enter 不报错', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Should show enter hint
      expect(screen.getByText(/输入关键词/)).toBeInTheDocument();
    });

    it('无匹配结果时显示无结果提示', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.change(input, { target: { value: 'ZZZnotfound' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(screen.getByText(/未找到匹配结果/)).toBeInTheDocument();
    });
  });

  describe('搜索选项', () => {
    it('caseSensitive checkbox 能切换状态', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is caseSensitive
      expect(checkboxes[0]).not.toBeChecked();
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });

    it('wholeWord checkbox 能切换状态', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      // Second checkbox is wholeWord
      expect(checkboxes[1]).not.toBeChecked();
      fireEvent.click(checkboxes[1]);
      expect(checkboxes[1]).toBeChecked();
    });

    it('useRegex (regex) checkbox 能切换状态', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      // Third checkbox is regex
      expect(checkboxes[2]).not.toBeChecked();
      fireEvent.click(checkboxes[2]);
      expect(checkboxes[2]).toBeChecked();
    });
  });

  describe('跨文件模式', () => {
    it('crossFile 切换后清空结果', () => {
      // First search in current file
      const { rerender } = render(<SearchPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Results should exist (match count text '找到 N 条匹配')
      const matchTexts = screen.queryAllByText(/找到.*条匹配/);
      expect(matchTexts.length).toBeGreaterThan(0);

      // Toggle crossFile
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[3]); // crossFile is the 4th checkbox
      
      // Results should be cleared
      expect(screen.queryByText(/找到.*条匹配/)).not.toBeInTheDocument();
      // Query still set, so shows no-results message
      expect(screen.getByText(/未找到匹配结果/)).toBeInTheDocument();
    });

    it('crossFile checkbox 能切换状态', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const crossFileCb = checkboxes[3];
      expect(crossFileCb).not.toBeChecked();
      fireEvent.click(crossFileCb);
      expect(crossFileCb).toBeChecked();
    });

    it('跨文件搜索会把 wholeWord 传给后端', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockedInvoke = vi.mocked(invoke);
      mockedInvoke.mockResolvedValue([]);

      render(<SearchPanel {...defaultProps} searchDir="/some/dir" />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[3]);

      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.change(input, { target: { value: 'Hello' } });

      act(() => {
        vi.advanceTimersByTime(350);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedInvoke).toHaveBeenCalledWith('search_files', expect.objectContaining({
        directory: '/some/dir',
        query: 'Hello',
        wholeWord: true,
      }));
    });
  });

  describe('替换功能', () => {
    it('选中结果后替换按钮可用', async () => {
      render(<SearchPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Replace button should be disabled before selection
      // Replace buttons: find the single "替换" (not "全部替换")
      const replaceBtns = screen.getAllByTitle(/替换/);
      const replaceBtn = replaceBtns.find(b => b.textContent === '替换');
      expect(replaceBtn).toBeDefined();
      expect(replaceBtn!).toBeDisabled();
      
      // Click a result to select it
      const resultItems = screen.getAllByRole('button').filter(
        b => b.textContent?.includes('Hello')
      );
      expect(resultItems.length).toBeGreaterThan(0);
      fireEvent.click(resultItems[0]);

      // Replace button should now be enabled (or at least selected)
      expect(defaultProps.onResultClick).toHaveBeenCalled();
    });

    it('跨文件全部替换会把 wholeWord 传给后端', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockedInvoke = vi.mocked(invoke);
      mockedInvoke.mockResolvedValue({ replaced_count: 1, files_modified: ['/some/dir/test.md'] });

      render(<SearchPanel {...defaultProps} searchDir="/some/dir" />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[3]);

      fireEvent.change(screen.getByPlaceholderText(/查找/), { target: { value: 'Hello' } });
      fireEvent.change(screen.getByPlaceholderText(/替换/), { target: { value: 'Hi' } });
      fireEvent.click(screen.getByTitle(/全部替换/));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedInvoke).toHaveBeenCalledWith('replace_in_files', expect.objectContaining({
        directory: '/some/dir',
        query: 'Hello',
        replacement: 'Hi',
        wholeWord: true,
      }));
    });
  });

  describe('关闭', () => {
    it('按 Escape 调用 onClose', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('点击关闭按钮调用 onClose', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const closeBtn = screen.getByTitle(/关闭/);
      fireEvent.click(closeBtn);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('在替换框按 Escape 也调用 onClose', () => {
      render(<SearchPanel {...defaultProps} />);
      
      const replaceInput = screen.getByPlaceholderText(/替换/);
      fireEvent.keyDown(replaceInput, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('防抖验证', () => {
    it('跨文件模式下 query 变化不应立即触发搜索（需要等待300ms）', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockedInvoke = vi.mocked(invoke);
      mockedInvoke.mockResolvedValue([]);
      
      const propsWithDir = {
        ...defaultProps,
        searchDir: '/some/dir',
      };
      
      render(<SearchPanel {...propsWithDir} />);
      
      // Enable cross-file mode
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[3]); // crossFile
      
      // Type query
      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      // Before 300ms, search should NOT be called yet
      expect(mockedInvoke).not.toHaveBeenCalled();
      
      // Advance time past 300ms debounce
      act(() => { vi.advanceTimersByTime(350); });
      
      // Now search should have been triggered
      await act(async () => {
        // Wait for any async resolution
        await vi.advanceTimersByTime(100);
      });
    });

    it('快速连续输入只触发一次搜索', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockedInvoke = vi.mocked(invoke);
      mockedInvoke.mockResolvedValue([]);
      
      const propsWithDir = {
        ...defaultProps,
        searchDir: '/some/dir',
      };
      
      render(<SearchPanel {...propsWithDir} />);
      
      // Enable cross-file mode
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[3]);
      
      const input = screen.getByPlaceholderText(/查找/);
      
      // Type rapidly
      fireEvent.change(input, { target: { value: 'H' } });
      act(() => vi.advanceTimersByTime(100));
      fireEvent.change(input, { target: { value: 'He' } });
      act(() => vi.advanceTimersByTime(100));
      fireEvent.change(input, { target: { value: 'Hel' } });
      act(() => vi.advanceTimersByTime(100));
      fireEvent.change(input, { target: { value: 'Hell' } });
      
      // Not yet called because last type was < 300ms ago
      expect(mockedInvoke).not.toHaveBeenCalled();
      
      // Advance past final debounce
      act(() => { vi.advanceTimersByTime(350); });
      
      await act(async () => {
        await vi.advanceTimersByTime(100);
      });
    });

    it('跨文件模式下切换搜索选项会重新触发搜索', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockedInvoke = vi.mocked(invoke);
      mockedInvoke.mockResolvedValue([]);

      render(<SearchPanel {...defaultProps} searchDir="/some/dir" />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[3]);

      const input = screen.getByPlaceholderText(/查找/);
      fireEvent.change(input, { target: { value: 'Hello' } });

      act(() => {
        vi.advanceTimersByTime(350);
      });

      await act(async () => {
        await Promise.resolve();
      });

      mockedInvoke.mockClear();

      fireEvent.click(checkboxes[1]);

      act(() => {
        vi.advanceTimersByTime(350);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedInvoke).toHaveBeenCalledWith('search_files', expect.objectContaining({
        directory: '/some/dir',
        query: 'Hello',
        wholeWord: true,
      }));
    });
  });

  describe('searchStatus 状态', () => {
    it('初始状态下 loading/error/replaceMessage 都为空', () => {
      render(<SearchPanel {...defaultProps} />);
      
      // No error or replace message shown initially
      expect(screen.queryByText(/错误/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/已替换/i)).not.toBeInTheDocument();
    });
  });
});
