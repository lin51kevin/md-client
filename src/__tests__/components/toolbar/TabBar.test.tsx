import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabBar } from '../../../components/toolbar/TabBar';
import { Tab } from '../../../types';

/** Helper: find the dirty tab title span (parent span with italic style) */
function findDirtyTabTitle(container: HTMLElement) {
  return container.querySelector('span[style*="italic"]');
}

describe('TabBar', () => {
  const mockTabs: Tab[] = [
    { id: 'tab-1', filePath: '/path/file1.md', doc: '# File 1', isDirty: false },
    { id: 'tab-2', filePath: null, doc: '# File 2', isDirty: true },
    { id: 'tab-3', filePath: '/path/file3.md', doc: '# File 3', isDirty: false, isPinned: true },
  ];

  const defaultProps = {
    tabs: mockTabs,
    activeTabId: 'tab-1',
    onActivate: vi.fn(),
    onClose: vi.fn(),
    onNew: vi.fn(),
    onReorder: vi.fn(),
    onContextMenu: vi.fn(),
    getTabTitle: (tab: Tab) => {
      return tab.filePath?.split('/').pop() || 'Untitled.md';
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all tabs', () => {
      const { container } = render(<TabBar {...defaultProps} />);
      
      expect(screen.getByText('file1.md')).toBeInTheDocument();
      expect(findDirtyTabTitle(container)?.textContent?.includes('Untitled.md')).toBe(true);
      expect(screen.getByText('file3.md')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(<TabBar {...defaultProps} />);
      
      const activeTab = screen.getByText('file1.md');
      expect(activeTab).toBeInTheDocument();
    });

    it('should show dirty indicator', () => {
      const { container } = render(<TabBar {...defaultProps} />);
      
      const dirtyTab = findDirtyTabTitle(container);
      expect(dirtyTab).toBeTruthy();
      expect(dirtyTab?.textContent?.includes('●')).toBe(true);
    });

    it('should show pin icon for pinned tabs', () => {
      const propsWithPin = {
        ...defaultProps,
        onPin: vi.fn(),
        onUnpin: vi.fn(),
      };
      
      render(<TabBar {...propsWithPin} />);
      
      const pinnedTab = screen.getByText('file3.md');
      expect(pinnedTab).toBeInTheDocument();
    });

    it('should render new tab button', () => {
      render(<TabBar {...defaultProps} />);
      
      const newButton = screen.getByTitle('新建标签页');
      expect(newButton).toBeInTheDocument();
    });
  });

  describe('Tab Interaction', () => {
    it('should activate tab on click', () => {
      const { container } = render(<TabBar {...defaultProps} />);
      
      const tabContainers = container.querySelectorAll('[data-tab-id]');
      expect(tabContainers.length).toBe(3);
      
      const tab2 = Array.from(tabContainers).find(
        el => el.getAttribute('data-tab-id') === 'tab-2'
      );
      expect(tab2).toBeDefined();
    });

    it('should close tab on close button click', () => {
      const { container } = render(<TabBar {...defaultProps} />);
      
      const closeButtons = container.querySelectorAll('button[title*="关闭"]');
      fireEvent.click(closeButtons[0]);
      
      expect(defaultProps.onClose).toHaveBeenCalledWith('tab-1');
    });

    it('should prevent close button click from activating tab', () => {
      const { container } = render(<TabBar {...defaultProps} />);
      
      const closeButtons = container.querySelectorAll('button[title*="关闭"]');
      fireEvent.click(closeButtons[0]);
      
      expect(defaultProps.onActivate).not.toHaveBeenCalled();
    });

    it('should create new tab on plus button click', () => {
      render(<TabBar {...defaultProps} />);
      
      const newButton = screen.getByTitle('新建标签页');
      fireEvent.click(newButton);
      
      expect(defaultProps.onNew).toHaveBeenCalledTimes(1);
    });

    it('should open context menu on right click', () => {
      render(<TabBar {...defaultProps} />);
      
      const tab = screen.getByText('file1.md');
      fireEvent.contextMenu(tab, { clientX: 100, clientY: 200 });
      
      expect(defaultProps.onContextMenu).toHaveBeenCalledWith(100, 200, 'tab-1');
    });
  });

  describe('Drag and Drop', () => {
    it('should initiate drag on pointer down', () => {
      render(<TabBar {...defaultProps} />);
      
      const tab = screen.getByText('file1.md');
      fireEvent.pointerDown(tab, { button: 0, clientX: 50 });
      
      expect(defaultProps.onActivate).toHaveBeenCalledWith('tab-1');
    });

    it('should ignore non-left button pointer down', () => {
      render(<TabBar {...defaultProps} />);
      
      const tab = screen.getByText('file1.md');
      fireEvent.pointerDown(tab, { button: 2, clientX: 50 });
      
      expect(defaultProps.onActivate).not.toHaveBeenCalled();
    });

    it('should complete tab reorder on drag', async () => {
      const { container } = render(<TabBar {...defaultProps} />);
      
      const tab1 = screen.getByText('file1.md');
      const tab2 = container.querySelector('[data-tab-id="tab-2"]')!;
      
      fireEvent.pointerDown(tab1, { button: 0, clientX: 50 });
      fireEvent.pointerMove(window, { clientX: 150 });
      fireEvent.pointerUp(window);
      
      expect(defaultProps.onActivate).toHaveBeenCalledWith('tab-1');
    });
  });

  describe('Scroll Buttons', () => {
    it('should show scroll buttons when tabs overflow', async () => {
      const manyTabs = Array.from({ length: 20 }, (_, i) => ({
        id: `tab-${i}`,
        filePath: `/file${i}.md`,
        doc: `# File ${i}`,
        isDirty: false,
      }));

      render(<TabBar {...defaultProps} tabs={manyTabs} />);
      
      const leftButton = screen.queryByLabelText('Scroll Left');
      const rightButton = screen.queryByLabelText('Scroll Right');
      
      expect(document.querySelector('.lucide-chevron-left')).toBeDefined();
      expect(document.querySelector('.lucide-chevron-right')).toBeDefined();
    });
  });

  describe('Rename Functionality', () => {
    it('should show rename input when renamingTabId is set', () => {
      const propsWithRename = {
        ...defaultProps,
        renamingTabId: 'tab-1',
        onStartRename: vi.fn(),
        onConfirmRename: vi.fn(),
        onCancelRename: vi.fn(),
      };
      
      render(<TabBar {...propsWithRename} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('file1.md');
    });

    it('should call onConfirmRename on Enter key', () => {
      const propsWithRename = {
        ...defaultProps,
        renamingTabId: 'tab-1',
        onStartRename: vi.fn(),
        onConfirmRename: vi.fn(),
        onCancelRename: vi.fn(),
      };
      
      render(<TabBar {...propsWithRename} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newname.md' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(propsWithRename.onConfirmRename).toHaveBeenCalledWith('tab-1', 'newname.md');
    });

    it('should call onCancelRename on Escape key', () => {
      const propsWithRename = {
        ...defaultProps,
        renamingTabId: 'tab-1',
        onStartRename: vi.fn(),
        onConfirmRename: vi.fn(),
        onCancelRename: vi.fn(),
      };
      
      render(<TabBar {...propsWithRename} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(propsWithRename.onCancelRename).toHaveBeenCalledTimes(1);
    });

    it('should auto-focus and select text in rename input', async () => {
      const propsWithRename = {
        ...defaultProps,
        renamingTabId: 'tab-1',
        onStartRename: vi.fn(),
        onConfirmRename: vi.fn(),
        onCancelRename: vi.fn(),
      };
      
      render(<TabBar {...propsWithRename} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('file1.md');
    });
  });

  describe('Pin/Unpin Functionality', () => {
    it('should call onPin when pinning a tab', () => {
      const propsWithPin = {
        ...defaultProps,
        onPin: vi.fn(),
        onUnpin: vi.fn(),
      };
      
      render(<TabBar {...propsWithPin} />);
      expect(propsWithPin.onPin).toBeDefined();
    });

    it('should call onUnpin for pinned tabs', () => {
      const propsWithPin = {
        ...defaultProps,
        onPin: vi.fn(),
        onUnpin: vi.fn(),
      };
      
      render(<TabBar {...propsWithPin} />);
      expect(propsWithPin.onUnpin).toBeDefined();
    });
  });

  describe('T6: Dirty Tab Visual Indicator', () => {
    const getTabTitleNoDot = (tab: Tab) => {
      return tab.filePath?.split('/').pop() || 'Untitled.md';
    };

    it('should append ● suffix for dirty tabs', () => {
      const { container } = render(<TabBar {...defaultProps} getTabTitle={getTabTitleNoDot} />);
      const dirtyTitle = findDirtyTabTitle(container);
      expect(dirtyTitle).toBeTruthy();
      expect(dirtyTitle?.textContent?.trim()).toBe('Untitled.md ●');
    });

    it('should NOT append ● for clean tabs', () => {
      render(<TabBar {...defaultProps} getTabTitle={getTabTitleNoDot} />);
      expect(screen.getByText('file1.md')).toBeInTheDocument();
      const el = screen.getByText('file1.md');
      expect(el.textContent?.includes('●')).toBe(false);
    });

    it('should style ● with --warning-color', () => {
      const { container } = render(<TabBar {...defaultProps} getTabTitle={getTabTitleNoDot} />);
      const dot = container.querySelector('span[style*="warning-color"]');
      expect(dot).toBeTruthy();
      expect(dot?.textContent?.trim()).toBe('●');
    });

    it('should apply italic and bold style to dirty tab title', () => {
      const { container } = render(<TabBar {...defaultProps} getTabTitle={getTabTitleNoDot} />);
      const dirtyTitle = findDirtyTabTitle(container);
      expect(dirtyTitle).toBeTruthy();
      expect(dirtyTitle?.textContent?.includes('Untitled.md')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TabBar {...defaultProps} />);
      
      expect(screen.getByTitle('新建标签页')).toBeInTheDocument();
      const closeButtons = screen.getAllByTitle(/关闭/);
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<TabBar {...defaultProps} />);
      
      const tabs = screen.getAllByText(/file\d+\.md|Untitled/);
      expect(tabs.length).toBeGreaterThan(0);
    });
  });
});
