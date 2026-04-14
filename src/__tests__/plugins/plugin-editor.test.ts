import { describe, it, expect, vi } from 'vitest';
import { createEditorAPI } from '../../plugins/plugin-editor';

describe('createEditorAPI', () => {
  describe('getActiveFilePath', () => {
    it('returns the active file path from getActiveTab dep', () => {
      const getActiveTab = vi.fn(() => ({ path: '/workspace/note.md', content: '# Hello' }));
      const api = createEditorAPI({ cmViewRef: { current: null }, getActiveTab });
      expect(api.getActiveFilePath()).toBe('/workspace/note.md');
    });

    it('returns null when getActiveTab returns null', () => {
      const getActiveTab = vi.fn(() => null);
      const api = createEditorAPI({ cmViewRef: { current: null }, getActiveTab });
      expect(api.getActiveFilePath()).toBeNull();
    });

    it('returns null when active tab has a null path', () => {
      const getActiveTab = vi.fn(() => ({ path: null, content: '' }));
      const api = createEditorAPI({ cmViewRef: { current: null }, getActiveTab });
      expect(api.getActiveFilePath()).toBeNull();
    });

    it('returns null when getActiveTab dep is not provided', () => {
      const api = createEditorAPI({ cmViewRef: { current: null } });
      expect(api.getActiveFilePath()).toBeNull();
    });
  });

  describe('getContent', () => {
    it('returns empty string when no editor view is available', () => {
      const api = createEditorAPI({ cmViewRef: { current: null } });
      expect(api.getContent()).toBe('');
    });

    it('returns editor document content', () => {
      const mockView = {
        state: {
          doc: { toString: () => '# Hello World\n\nSome content' },
        },
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      expect(api.getContent()).toBe('# Hello World\n\nSome content');
    });

    it('returns empty string for empty document', () => {
      const mockView = {
        state: {
          doc: { toString: () => '' },
        },
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      expect(api.getContent()).toBe('');
    });
  });

  describe('insertText', () => {
    it('does nothing when no editor view is available', () => {
      const api = createEditorAPI({ cmViewRef: { current: null } });
      expect(() => api.insertText('hello')).not.toThrow();
    });

    it('inserts text at current cursor position', () => {
      const dispatch = vi.fn();
      const mockView = {
        state: {
          doc: { toString: () => 'abc' },
          selection: { main: { from: 1, to: 1, anchor: 1 } },
        },
        dispatch,
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      api.insertText('X');
      expect(dispatch).toHaveBeenCalledOnce();
      const change = dispatch.mock.calls[0][0].changes;
      expect(change).toEqual({ from: 1, to: 1, insert: 'X' });
      const sel = dispatch.mock.calls[0][0].selection;
      expect(sel).toEqual({ anchor: 2 });
    });

    it('inserts text at explicit from/to positions', () => {
      const dispatch = vi.fn();
      const mockView = {
        state: {
          doc: { toString: () => 'abc' },
          selection: { main: { from: 1, to: 1, anchor: 1 } },
        },
        dispatch,
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      api.insertText('XY', 0, 3);
      const change = dispatch.mock.calls[0][0].changes;
      expect(change).toEqual({ from: 0, to: 3, insert: 'XY' });
    });

    it('replaces selection when from !== to in cursor', () => {
      const dispatch = vi.fn();
      const mockView = {
        state: {
          doc: { toString: () => 'hello' },
          selection: { main: { from: 1, to: 4, anchor: 1 } },
        },
        dispatch,
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      api.insertText('X');
      const change = dispatch.mock.calls[0][0].changes;
      expect(change).toEqual({ from: 1, to: 4, insert: 'X' });
    });

    it('inserts empty string without error', () => {
      const dispatch = vi.fn();
      const mockView = {
        state: {
          doc: { toString: () => 'abc' },
          selection: { main: { from: 1, to: 1 } },
        },
        dispatch,
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      api.insertText('');
      expect(dispatch).toHaveBeenCalledOnce();
    });

    it('inserts multiline text', () => {
      const dispatch = vi.fn();
      const mockView = {
        state: {
          doc: { toString: () => 'line1' },
          selection: { main: { from: 5, to: 5 } },
        },
        dispatch,
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      api.insertText('\nline2\nline3');
      const change = dispatch.mock.calls[0][0].changes;
      expect(change.insert).toBe('\nline2\nline3');
      expect(dispatch.mock.calls[0][0].selection.anchor).toBe(5 + 12);
    });

    it('explicit from overrides cursor position', () => {
      const dispatch = vi.fn();
      const mockView = {
        state: {
          doc: { toString: () => 'abcdefghij' },
          selection: { main: { from: 5, to: 5 } },
        },
        dispatch,
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      api.insertText('X', 2);
      const change = dispatch.mock.calls[0][0].changes;
      expect(change.from).toBe(2);
      expect(change.to).toBe(5); // uses cursor `to` as fallback
    });
  });

  describe('content change detection', () => {
    it('reflects view changes after insertText', () => {
      const dispatch = vi.fn();
      const content = 'initial content';
      const mockView = {
        state: {
          doc: { toString: () => content },
          selection: { main: { from: 0, to: 0 } },
        },
        dispatch,
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      expect(api.getContent()).toBe('initial content');
      api.insertText('prefix ');
      expect(dispatch).toHaveBeenCalled();
    });

    it('handles very large content in getContent', () => {
      const bigText = 'x'.repeat(100_000);
      const mockView = {
        state: { doc: { toString: () => bigText } },
      } as unknown as import('@codemirror/view').EditorView;
      const api = createEditorAPI({ cmViewRef: { current: mockView } });
      expect(api.getContent()).toHaveLength(100_000);
    });
  });

  describe('ref switching', () => {
    it('returns content from the latest view when ref changes', () => {
      const ref: React.RefObject<import('@codemirror/view').EditorView | null> = { current: null };
      const api = createEditorAPI({ cmViewRef: ref });
      expect(api.getContent()).toBe('');

      ref.current = {
        state: { doc: { toString: () => 'new content' } },
      } as unknown as import('@codemirror/view').EditorView;
      expect(api.getContent()).toBe('new content');
    });
  });
});
