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
  });
});
