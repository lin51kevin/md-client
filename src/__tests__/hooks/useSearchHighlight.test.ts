import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSearchHighlight } from '../../hooks/useSearchHighlight';

describe('useSearchHighlight', () => {
  describe('Initial Setup', () => {
    it('should return search highlight extension', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      expect(result.current.searchHighlightExtension).toBeDefined();
      expect(Array.isArray(result.current.searchHighlightExtension)).toBe(true);
    });

    it('should return setMatches function', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      expect(typeof result.current.setMatches).toBe('function');
    });

    it('should return clearMatches function', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      expect(typeof result.current.clearMatches).toBe('function');
    });
  });

  describe('Extension Memoization', () => {
    it('should memoize extension across re-renders', () => {
      const { result, rerender } = renderHook(() => useSearchHighlight());
      
      const firstExtension = result.current.searchHighlightExtension;
      
      rerender();
      
      const secondExtension = result.current.searchHighlightExtension;
      
      expect(firstExtension).toBe(secondExtension);
    });

    it('should memoize setMatches function', () => {
      const { result, rerender } = renderHook(() => useSearchHighlight());
      
      const firstSetMatches = result.current.setMatches;
      
      rerender();
      
      const secondSetMatches = result.current.setMatches;
      
      expect(firstSetMatches).toBe(secondSetMatches);
    });

    it('should memoize clearMatches function', () => {
      const { result, rerender } = renderHook(() => useSearchHighlight());
      
      const firstClearMatches = result.current.clearMatches;
      
      rerender();
      
      const secondClearMatches = result.current.clearMatches;
      
      expect(firstClearMatches).toBe(secondClearMatches);
    });
  });

  describe('setMatches Function', () => {
    it('should accept match data without throwing', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 0, to: 5 },
        { from: 10, to: 15 },
      ];
      
      // Should not throw even without a view
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
    });

    it('should handle empty matches array', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      expect(() => result.current.setMatches([], -1)).not.toThrow();
    });

    it('should handle multiple matches with different active indices', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 0, to: 5 },
        { from: 10, to: 15 },
        { from: 20, to: 25 },
      ];
      
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
      expect(() => result.current.setMatches(matches, 1)).not.toThrow();
      expect(() => result.current.setMatches(matches, 2)).not.toThrow();
    });

    it('should handle negative active index', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 0, to: 5 },
        { from: 10, to: 15 },
      ];
      
      expect(() => result.current.setMatches(matches, -1)).not.toThrow();
    });

    it('should handle active index beyond matches length', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 0, to: 5 },
      ];
      
      expect(() => result.current.setMatches(matches, 10)).not.toThrow();
    });
  });

  describe('clearMatches Function', () => {
    it('should clear matches without throwing', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      expect(() => result.current.clearMatches()).not.toThrow();
    });
  });

  describe('Match Ranges', () => {
    it('should handle zero-length match range', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 10, to: 10 }, // Zero length
      ];
      
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
    });

    it('should handle consecutive match ranges', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 0, to: 5 },
        { from: 5, to: 10 },
        { from: 10, to: 15 },
      ];
      
      expect(() => result.current.setMatches(matches, 1)).not.toThrow();
    });

    it('should handle overlapping match ranges', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 0, to: 10 },
        { from: 5, to: 15 },
      ];
      
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
    });

    it('should handle very large match ranges', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [
        { from: 0, to: 100000 },
      ];
      
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
    });
  });

  describe('Many Matches', () => {
    it('should handle many matches efficiently', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      // Create 1000 matches
      const matches = Array.from({ length: 1000 }, (_, i) => ({
        from: i * 10,
        to: i * 10 + 5,
      }));
      
      expect(() => result.current.setMatches(matches, 500)).not.toThrow();
    });

    it('should handle updating matches multiple times', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches1 = [{ from: 0, to: 5 }];
      const matches2 = [{ from: 10, to: 15 }];
      const matches3 = [{ from: 20, to: 25 }];
      
      result.current.setMatches(matches1, 0);
      result.current.setMatches(matches2, 0);
      result.current.setMatches(matches3, 0);
      
      expect(result.current.setMatches).toBeDefined();
    });
  });

  describe('Integration with CodeMirror', () => {
    it('should provide extensions compatible with CodeMirror', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      // Extensions should be an array
      expect(Array.isArray(result.current.searchHighlightExtension)).toBe(true);
      
      // Should contain at least one extension
      expect(result.current.searchHighlightExtension.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle match at document start', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [{ from: 0, to: 1 }];
      
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
    });

    it('should handle match with very large position', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [{ from: 1000000, to: 1000005 }];
      
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
    });

    it('should handle matches with from > to (invalid range)', () => {
      const { result } = renderHook(() => useSearchHighlight());
      
      const matches = [{ from: 10, to: 5 }]; // Invalid
      
      expect(() => result.current.setMatches(matches, 0)).not.toThrow();
    });
  });
});
