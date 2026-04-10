import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusMode } from '../../hooks/useFocusMode';

describe('useFocusMode', () => {
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;
  let mockExitFullscreen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fullscreen API
    mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
    mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
    
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: mockRequestFullscreen,
    });
    
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: mockExitFullscreen,
    });

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize in normal mode', () => {
      const { result } = renderHook(() => useFocusMode());
      
      expect(result.current.focusMode).toBe('normal');
      expect(result.current.isChromeless).toBe(false);
      expect(result.current.hideStatusBar).toBe(false);
    });

    it('should call onModeChange callback on initialization', () => {
      const onModeChange = vi.fn();
      
      renderHook(() => useFocusMode({ onModeChange }));
      
      // onModeChange should not be called on initial render
      expect(onModeChange).not.toHaveBeenCalled();
    });
  });

  describe('Mode Transitions', () => {
    it('should switch to typewriter mode', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('typewriter');
      });
      
      expect(result.current.focusMode).toBe('typewriter');
      expect(result.current.isChromeless).toBe(true);
      expect(result.current.hideStatusBar).toBe(true);
    });

    it('should switch to focus mode', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('focus');
      });
      
      expect(result.current.focusMode).toBe('focus');
      expect(result.current.isChromeless).toBe(true);
      expect(result.current.hideStatusBar).toBe(false);
    });

    it('should switch to fullscreen mode', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('fullscreen');
      });
      
      expect(result.current.focusMode).toBe('fullscreen');
      expect(result.current.isChromeless).toBe(true);
      expect(result.current.hideStatusBar).toBe(true);
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    it('should return to normal mode', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('typewriter');
      });
      
      act(() => {
        result.current.setFocusMode('normal');
      });
      
      expect(result.current.focusMode).toBe('normal');
      expect(result.current.isChromeless).toBe(false);
      expect(result.current.hideStatusBar).toBe(false);
    });
  });

  describe('Fullscreen API Integration', () => {
    it('should request fullscreen when entering fullscreen mode', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('fullscreen');
      });
      
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when leaving fullscreen mode', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        writable: true,
        value: document.documentElement,
      });

      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('fullscreen');
      });
      
      act(() => {
        result.current.setFocusMode('normal');
      });
      
      expect(mockExitFullscreen).toHaveBeenCalled();
    });

    it('should not exit fullscreen when not in fullscreen', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('typewriter');
      });
      
      act(() => {
        result.current.setFocusMode('normal');
      });
      
      expect(mockExitFullscreen).not.toHaveBeenCalled();
    });

    it('should handle fullscreen API errors gracefully', () => {
      mockRequestFullscreen.mockRejectedValue(new Error('Fullscreen denied'));
      
      const { result } = renderHook(() => useFocusMode());
      
      // Should not throw
      act(() => {
        result.current.setFocusMode('fullscreen');
      });
      
      expect(result.current.focusMode).toBe('fullscreen');
    });
  });

  describe('Fullscreen Change Event', () => {
    it('should reset to normal mode when fullscreen is exited externally', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('fullscreen');
      });
      
      expect(result.current.focusMode).toBe('fullscreen');
      
      // Simulate fullscreen exit via ESC key
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        writable: true,
        value: null,
      });
      
      act(() => {
        const event = new Event('fullscreenchange');
        document.dispatchEvent(event);
      });
      
      expect(result.current.focusMode).toBe('normal');
    });

    it('should not reset mode when fullscreen change occurs in non-fullscreen mode', () => {
      const { result } = renderHook(() => useFocusMode());
      
      act(() => {
        result.current.setFocusMode('typewriter');
      });
      
      act(() => {
        const event = new Event('fullscreenchange');
        document.dispatchEvent(event);
      });
      
      expect(result.current.focusMode).toBe('typewriter');
    });

    it('should cleanup fullscreen event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderHook(() => useFocusMode());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'fullscreenchange',
        expect.any(Function)
      );
    });
  });

  describe('onModeChange Callback', () => {
    it('should call onModeChange when mode changes', () => {
      const onModeChange = vi.fn();
      const { result } = renderHook(() => useFocusMode({ onModeChange }));
      
      act(() => {
        result.current.setFocusMode('typewriter');
      });
      
      expect(onModeChange).toHaveBeenCalledWith('typewriter');
    });

    it('should call onModeChange when exiting fullscreen externally', () => {
      const onModeChange = vi.fn();
      const { result } = renderHook(() => useFocusMode({ onModeChange }));
      
      act(() => {
        result.current.setFocusMode('fullscreen');
      });
      
      onModeChange.mockClear();
      
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        writable: true,
        value: null,
      });
      
      act(() => {
        const event = new Event('fullscreenchange');
        document.dispatchEvent(event);
      });
      
      expect(onModeChange).toHaveBeenCalledWith('normal');
    });

    it('should use latest onModeChange callback', () => {
      const onModeChange1 = vi.fn();
      const onModeChange2 = vi.fn();
      
      const { result, rerender } = renderHook(
        ({ cb }) => useFocusMode({ onModeChange: cb }),
        { initialProps: { cb: onModeChange1 } }
      );
      
      rerender({ cb: onModeChange2 });
      
      act(() => {
        result.current.setFocusMode('focus');
      });
      
      expect(onModeChange1).not.toHaveBeenCalled();
      expect(onModeChange2).toHaveBeenCalledWith('focus');
    });
  });

  describe('Chromeless and StatusBar Flags', () => {
    it('should set isChromeless correctly for all modes', () => {
      const { result } = renderHook(() => useFocusMode());
      
      expect(result.current.isChromeless).toBe(false); // normal
      
      act(() => { result.current.setFocusMode('typewriter'); });
      expect(result.current.isChromeless).toBe(true);
      
      act(() => { result.current.setFocusMode('focus'); });
      expect(result.current.isChromeless).toBe(true);
      
      act(() => { result.current.setFocusMode('fullscreen'); });
      expect(result.current.isChromeless).toBe(true);
      
      act(() => { result.current.setFocusMode('normal'); });
      expect(result.current.isChromeless).toBe(false);
    });

    it('should set hideStatusBar correctly for all modes', () => {
      const { result } = renderHook(() => useFocusMode());
      
      expect(result.current.hideStatusBar).toBe(false); // normal
      
      act(() => { result.current.setFocusMode('typewriter'); });
      expect(result.current.hideStatusBar).toBe(true);
      
      act(() => { result.current.setFocusMode('focus'); });
      expect(result.current.hideStatusBar).toBe(false);
      
      act(() => { result.current.setFocusMode('fullscreen'); });
      expect(result.current.hideStatusBar).toBe(true);
      
      act(() => { result.current.setFocusMode('normal'); });
      expect(result.current.hideStatusBar).toBe(false);
    });
  });
});
