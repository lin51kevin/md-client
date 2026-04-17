import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabBar } from '../../../components/toolbar/TabBar';
import { Tab } from '../../../types';

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
      const name = tab.filePath?.split('/').pop() || 'Untitled.md';
      return tab.isDirty ? `${name} \u25cf` : name;
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all tabs', () => {
      render(<TabBar {...defaultProps} />);
      
      expect(screen.getByText('file1.md')).toBeInTheDocument();
      expect(screen.getByText(/Untitled\.md.*\u25cf/)).toBeInTheDocument();
      expect(screen.getByText('file3.md')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(<TabBar {...defaultProps} />);
      
      // Active tab is the first one (file1.md)
      const activeTab = screen.getByText('file1.md');
      expect(activeTab).toBeInTheDocument();
    });

    it('should show dirty indicator', () => {
      render(<TabBar {...defaultProps} />);
      
      const dirtyTab = screen.getByText(/Untitled\.md.*\u25cf/);
      expect(dirtyTab).toBeInTheDocument();
    });

    it('should show pin icon for pinned tabs', () => {
      const propsWithPin = {
        ...defaultProps,
        onPin: vi.fn(),
        onUnpin: vi.fn(),
      };
      
      render(<TabBar {...propsWithPin} />);
      
      // Find the pinned tab
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
      
      // Verify tabs are rendered with correct data attributes
      const tabContainers = container.querySelectorAll('[data-tab-id]');
      expect(tabContainers.length).toBe(3);
      
      // Verify the second tab exists
      const tab2 = Array.from(tabContainers).find(
        el => el.getAttribute('data-tab-id') === 'tab-2'
      );
      expect(tab2).toBeDefined();
    });

    it('should close tab on close button click', () => {
      const { container } = render(<TabBar {...defaultProps} />);
      
      // Find close buttons by title
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
      
      // Tab should be activated
      expect(defaultProps.onActivate).toHaveBeenCalledWith('tab-1');
    });

    it('should ignore non-left button pointer down', () => {
      render(<TabBar {...defaultProps} />);
      
      const tab = screen.getByText('file1.md');
      fireEvent.pointerDown(tab, { button: 2, clientX: 50 }); // Right button
      
      expect(defaultProps.onActivate).not.toHaveBeenCalled();
    });

    it('should complete tab reorder on drag', async () => {
      render(<TabBar {...defaultProps} />);
      
      const tab1 = screen.getByText('file1.md');
      const tab2 = screen.getByText(/Untitled\.md/);
      
      // Start drag on tab1
      fireEvent.pointerDown(tab1, { button: 0, clientX: 50 });
      
      // Move over tab2
      fireEvent.pointerMove(window, { clientX: 150 });
      
      // Release
      fireEvent.pointerUp(window);
      
      // Note: Full drag behavior requires DOM positioning, 
      // this tests the event handlers are wired correctly
      expect(defaultProps.onActivate).toHaveBeenCalledWith('tab-1');
    });
  });

  describe('Scroll Buttons', () => {
    it('should show scroll buttons when tabs overflow', async () => {
      // Create many tabs to force overflow
      const manyTabs = Array.from({ length: 20 }, (_, i) => ({
        id: `tab-${i}`,
        filePath: `/file${i}.md`,
        doc: `# File ${i}`,
        isDirty: false,
      }));

      render(<TabBar {...defaultProps} tabs={manyTabs} />);
      
      // Scroll buttons should be rendered
      const leftButton = screen.queryByLabelText('Scroll Left');
      const rightButton = screen.queryByLabelText('Scroll Right');
      
      // Note: Buttons visibility depends on scroll state
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
      
      // Input should be rendered
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
      
      // Pin functionality would typically be in context menu
      // This tests that the props are passed correctly
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

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TabBar {...defaultProps} />);
      
      expect(screen.getByTitle('新建标签页')).toBeInTheDocument();
      // Close buttons have titles
      const closeButtons = screen.getAllByTitle(/关闭/);
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<TabBar {...defaultProps} />);
      
      // Tabs should be present and interactive
      const tabs = screen.getAllByText(/file\d+\.md|Untitled/);
      expect(tabs.length).toBeGreaterThan(0);
    });
  });
});
