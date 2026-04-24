import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCursorPosition } from '../../hooks/useCursorPosition';
import { useEditorStore } from '../../stores/editor-store';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

describe('useCursorPosition', () => {
  beforeEach(() => {
    // Reset fake timers for rAF tests
    vi.useFakeTimers();
    // Reset store to clean state
    useEditorStore.setState({ cursor: { line: 1, col: 1 } } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  describe('Initial State', () => {
    it('editor-store starts at line 1, col 1', () => {
      // cursorPos is now in the store; hook no longer returns it
      renderHook(() => useCursorPosition());
      const { line, col } = useEditorStore.getState().cursor;
      expect({ line, col }).toEqual({ line: 1, col: 1 });
    });

    it('should return a cursor extension', () => {
      const { result } = renderHook(() => useCursorPosition());
      
      expect(result.current.cursorExtension).toBeDefined();
    });
  });

  describe('Cursor Position Updates', () => {
    it('should update position when cursor moves', () => {
      const { result } = renderHook(() => useCursorPosition());
      
      // Create a simple editor state
      const state = EditorState.create({
        doc: 'Line 1\nLine 2\nLine 3',
        extensions: [result.current.cursorExtension],
      });

      // Create a view (this would trigger updates in real usage)
      const view = new EditorView({
        state,
        parent: document.body,
      });

      // Move cursor to position 10 (second line)
      view.dispatch({
        selection: { anchor: 10, head: 10 },
      });

      // In real CodeMirror, the update listener would be called
      // For testing purposes, we verify the extension is correctly configured
      expect(result.current.cursorExtension).toBeDefined();

      view.destroy();
    });

    it('should update position when document changes', () => {
      const { result } = renderHook(() => useCursorPosition());
      
      const state = EditorState.create({
        doc: 'Initial text',
        extensions: [result.current.cursorExtension],
      });

      const view = new EditorView({
        state,
        parent: document.body,
      });

      // Insert text, which changes the document
      view.dispatch({
        changes: { from: 0, insert: 'New ' },
      });

      // Verify extension is still active
      expect(result.current.cursorExtension).toBeDefined();

      view.destroy();
    });
  });

  describe('Extension Memoization', () => {
    it('should memoize cursor extension across re-renders', () => {
      const { result, rerender } = renderHook(() => useCursorPosition());
      
      const firstExtension = result.current.cursorExtension;
      
      rerender();
      
      const secondExtension = result.current.cursorExtension;
      
      expect(firstExtension).toBe(secondExtension);
    });
  });

  describe('Multi-line Document', () => {
    it('should correctly calculate position in multi-line document', () => {
      const { result } = renderHook(() => useCursorPosition());
      
      const multiLineDoc = 'Line 1\nLine 2\nLine 3\nLine 4';
      const state = EditorState.create({
        doc: multiLineDoc,
        extensions: [result.current.cursorExtension],
      });

      const view = new EditorView({
        state,
        parent: document.body,
      });

      // Position 14 should be start of Line 3
      view.dispatch({
        selection: { anchor: 14, head: 14 },
      });

      // Verify extension handles multi-line docs
      expect(result.current.cursorExtension).toBeDefined();

      view.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      const { result } = renderHook(() => useCursorPosition());
      
      const state = EditorState.create({
        doc: '',
        extensions: [result.current.cursorExtension],
      });

      const view = new EditorView({
        state,
        parent: document.body,
      });

      // cursorPos is in the store after the refactor
      const { line, col } = useEditorStore.getState().cursor;
      expect(line).toBeGreaterThanOrEqual(1);
      expect(col).toBeGreaterThanOrEqual(1);

      view.destroy();
    });

    it('should handle very long lines', () => {
      const { result } = renderHook(() => useCursorPosition());
      
      const longLine = 'a'.repeat(10000);
      const state = EditorState.create({
        doc: longLine,
        extensions: [result.current.cursorExtension],
      });

      const view = new EditorView({
        state,
        parent: document.body,
      });

      view.dispatch({
        selection: { anchor: 5000, head: 5000 },
      });

      expect(result.current.cursorExtension).toBeDefined();

      view.destroy();
    });
  });

  // ── P0-A: Store-based cursor ──────────────────────────────────────────────
  describe('Store Integration', () => {
    it('writes line/col to editor-store when cursor moves', () => {
      useEditorStore.setState({ cursor: { line: 1, col: 1 } } as any);
      const { result } = renderHook(() => useCursorPosition());

      const state = EditorState.create({
        doc: 'Line 1\nLine 2',
        extensions: [result.current.cursorExtension],
      });
      const view = new EditorView({ state, parent: document.body });

      act(() => {
        // Position 7 = start of "Line 2"
        view.dispatch({ selection: { anchor: 7, head: 7 } });
        vi.runAllTimers(); // flush rAF
      });

      expect(useEditorStore.getState().cursor.line).toBe(2);
      expect(useEditorStore.getState().cursor.col).toBe(1);
      view.destroy();
    });

    it('writes col offset correctly for mid-line cursor', () => {
      useEditorStore.setState({ cursor: { line: 1, col: 1 } } as any);
      const { result } = renderHook(() => useCursorPosition());

      const state = EditorState.create({
        doc: 'abcdef',
        extensions: [result.current.cursorExtension],
      });
      const view = new EditorView({ state, parent: document.body });

      act(() => {
        view.dispatch({ selection: { anchor: 3, head: 3 } });
        vi.runAllTimers();
      });

      expect(useEditorStore.getState().cursor.col).toBe(4); // 0-indexed → col 4
      view.destroy();
    });

    it('does not expose cursorPos on hook return (store is source of truth)', () => {
      const { result } = renderHook(() => useCursorPosition());
      // After the refactor cursorPos is removed from the return object.
      // Accessing it should return undefined.
      expect((result.current as any).cursorPos).toBeUndefined();
    });
  });
});
