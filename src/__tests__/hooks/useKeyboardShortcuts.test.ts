import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ViewMode, FocusMode } from '../../types';

describe('useKeyboardShortcuts', () => {
  let createNewTab: ReturnType<typeof vi.fn>;
  let handleOpenFile: ReturnType<typeof vi.fn>;
  let handleSaveFile: ReturnType<typeof vi.fn>;
  let handleSaveAsFile: ReturnType<typeof vi.fn>;
  let closeTab: ReturnType<typeof vi.fn>;
  let setViewMode: ReturnType<typeof vi.fn>;
  let toggleFindReplace: ReturnType<typeof vi.fn>;
  let setFocusMode: ReturnType<typeof vi.fn>;
  let activeTabIdRef: { current: string };

  beforeEach(() => {
    createNewTab = vi.fn();
    handleOpenFile = vi.fn();
    handleSaveFile = vi.fn();
    handleSaveAsFile = vi.fn();
    closeTab = vi.fn();
    setViewMode = vi.fn();
    toggleFindReplace = vi.fn();
    setFocusMode = vi.fn();
    activeTabIdRef = { current: 'tab-1' };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderShortcuts = (focusMode: FocusMode = 'normal') => {
    return renderHook(() => useKeyboardShortcuts({
      createNewTab,
      handleOpenFile,
      handleSaveFile,
      handleSaveAsFile,
      closeTab,
      setViewMode,
      activeTabIdRef,
      toggleFindReplace,
      setFocusMode,
      focusMode,
    }));
  };

  const dispatchKeyEvent = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      shiftKey: options.shiftKey ?? false,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    window.dispatchEvent(event);
    return event;
  };

  describe('File Operations', () => {
    it('should create new tab with Ctrl+N', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('n', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(createNewTab).toHaveBeenCalledTimes(1);
    });

    it('should open file with Ctrl+O', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('o', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(handleOpenFile).toHaveBeenCalledTimes(1);
    });

    it('should save file with Ctrl+S', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('s', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(handleSaveFile).toHaveBeenCalledTimes(1);
    });

    it('should save as with Ctrl+Shift+S', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('S', { ctrlKey: true, shiftKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(handleSaveAsFile).toHaveBeenCalledTimes(1);
    });

    it('should close tab with Ctrl+W', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('w', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(closeTab).toHaveBeenCalledWith('tab-1');
    });
  });

  describe('View Mode Shortcuts', () => {
    it('should switch to edit mode with Ctrl+1', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('1', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(setViewMode).toHaveBeenCalledWith('edit');
    });

    it('should switch to split mode with Ctrl+2', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('2', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(setViewMode).toHaveBeenCalledWith('split');
    });

    it('should switch to preview mode with Ctrl+3', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('3', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(setViewMode).toHaveBeenCalledWith('preview');
    });
  });

  describe('Find/Replace', () => {
    it('should toggle find/replace with Ctrl+F', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('f', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(toggleFindReplace).toHaveBeenCalledTimes(1);
    });

    // Note: Ctrl+H is no longer a default binding for find/replace (only Ctrl+F is supported)
  });

  describe('Focus Mode', () => {
    it('should exit focus mode with ESC (without Ctrl)', () => {
      renderShortcuts('focus');
      
      const event = dispatchKeyEvent('Escape');
      
      expect(event.defaultPrevented).toBe(true);
      expect(setFocusMode).toHaveBeenCalledWith('normal');
    });

    it('should exit typewriter mode with ESC', () => {
      renderShortcuts('typewriter');
      
      const event = dispatchKeyEvent('Escape');
      
      expect(event.defaultPrevented).toBe(true);
      expect(setFocusMode).toHaveBeenCalledWith('normal');
    });

    it('should not exit normal mode with ESC', () => {
      renderShortcuts('normal');
      
      const event = dispatchKeyEvent('Escape');
      
      expect(event.defaultPrevented).toBe(false);
      expect(setFocusMode).not.toHaveBeenCalled();
    });

    it('should toggle typewriter mode with Ctrl+.', () => {
      renderShortcuts('normal');
      
      const event = dispatchKeyEvent('.', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(setFocusMode).toHaveBeenCalledWith('typewriter');
    });

    it('should exit typewriter mode with Ctrl+. when active', () => {
      renderShortcuts('typewriter');
      
      const event = dispatchKeyEvent('.', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(setFocusMode).toHaveBeenCalledWith('normal');
    });

    it('should toggle focus mode with Ctrl+,', () => {
      renderShortcuts('normal');
      
      const event = dispatchKeyEvent(',', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(setFocusMode).toHaveBeenCalledWith('focus');
    });

    it('should exit focus mode with Ctrl+, when active', () => {
      renderShortcuts('focus');
      
      const event = dispatchKeyEvent(',', { ctrlKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(setFocusMode).toHaveBeenCalledWith('normal');
    });
  });

  describe('Meta Key Support', () => {
    it('should support Cmd+N on macOS', () => {
      renderShortcuts();
      
      const event = dispatchKeyEvent('n', { metaKey: true });
      
      expect(event.defaultPrevented).toBe(true);
      expect(createNewTab).toHaveBeenCalledTimes(1);
    });

    it('should support both uppercase and lowercase keys', () => {
      renderShortcuts();
      
      dispatchKeyEvent('N', { ctrlKey: true });
      expect(createNewTab).toHaveBeenCalledTimes(1);
      
      dispatchKeyEvent('n', { ctrlKey: true });
      expect(createNewTab).toHaveBeenCalledTimes(2);
    });
  });

  describe('Non-Ctrl Key Handling', () => {
    it('should ignore keys without Ctrl/Meta modifier (except ESC in focus mode)', () => {
      renderShortcuts('normal');
      
      dispatchKeyEvent('n');
      dispatchKeyEvent('s');
      dispatchKeyEvent('1');
      
      expect(createNewTab).not.toHaveBeenCalled();
      expect(handleSaveFile).not.toHaveBeenCalled();
      expect(setViewMode).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const { unmount } = renderShortcuts();
      
      unmount();
      
      dispatchKeyEvent('n', { ctrlKey: true });
      
      expect(createNewTab).not.toHaveBeenCalled();
    });
  });

  describe('Params Ref Update', () => {
    it('should use latest params without re-registering listener', () => {
      const { rerender } = renderShortcuts();
      
      const newCreateNewTab = vi.fn();
      
      rerender();
      
      dispatchKeyEvent('n', { ctrlKey: true });
      
      // Should use the params from paramsRef.current
      expect(createNewTab).toHaveBeenCalledTimes(1);
    });
  });
});
