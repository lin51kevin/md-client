import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCodeBlockFold } from '../../hooks/useCodeBlockFold';

describe('useCodeBlockFold', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const CODE_JS = 'function hello() {\n  return "world";\n}';
  const CODE_PY = 'def foo():\n    return 42\n';

  describe('blockId', () => {
    it('should generate consistent ids for same lang+firstLine', () => {
      const { result } = renderHook(() => useCodeBlockFold());
      const { blockId } = result.current;
      const id1 = blockId('javascript', 'function hello() {');
      const id2 = blockId('javascript', 'function hello() {');
      expect(id1).toBe(id2);
    });

    it('should generate different ids for different lang', () => {
      const { result } = renderHook(() => useCodeBlockFold());
      const { blockId } = result.current;
      const id1 = blockId('javascript', 'function hello() {');
      const id2 = blockId('python', 'function hello() {');
      expect(id1).not.toBe(id2);
    });
  });

  describe('toggle / isCollapsed', () => {
    it('should start uncollapsed', () => {
      const { result } = renderHook(() => useCodeBlockFold());
      const { isCollapsed, blockId } = result.current;
      const id = blockId('javascript', CODE_JS.split('\n')[0]);
      expect(isCollapsed(id)).toBe(false);
    });

    it('should toggle collapsed state', () => {
      const { result } = renderHook(() => useCodeBlockFold());
      const { isCollapsed, toggle, blockId } = result.current;
      const id = blockId('javascript', CODE_JS.split('\n')[0]);

      act(() => toggle(id));
      expect(result.current.isCollapsed(id)).toBe(true);

      act(() => result.current.toggle(id));
      expect(result.current.isCollapsed(id)).toBe(false);
    });

    it('should persist collapsed state across re-renders', () => {
      const { result, rerender } = renderHook(() => useCodeBlockFold());
      const { isCollapsed, toggle, blockId } = result.current;
      const id = blockId('javascript', CODE_JS.split('\n')[0]);

      act(() => toggle(id));
      expect(result.current.isCollapsed(id)).toBe(true);

      rerender();
      expect(result.current.isCollapsed(id)).toBe(true);
    });
  });

  describe('lineCount', () => {
    it('should count lines correctly', () => {
      const { result } = renderHook(() => useCodeBlockFold());
      expect(result.current.lineCount('a\nb\nc')).toBe(3);
      expect(result.current.lineCount('single line')).toBe(1);
      expect(result.current.lineCount('')).toBe(1);
    });
  });

  describe('previewText', () => {
    it('should return collapsed preview text', () => {
      const { result } = renderHook(() => useCodeBlockFold());
      const text = result.current.previewText(CODE_JS, 'javascript');
      expect(text).toContain('javascript');
      expect(text).toContain('3 lines');
    });

    it('should show correct line count', () => {
      const { result } = renderHook(() => useCodeBlockFold());
      expect(result.current.previewText(CODE_PY, 'python')).toContain('3 lines');
    });
  });
});
