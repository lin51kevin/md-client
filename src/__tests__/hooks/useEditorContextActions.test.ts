import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorContextActions } from '../../hooks/useEditorContextActions';

// Minimal EditorView-like stub that records dispatched transactions
function makeEditorView(docText: string) {
  const view = {
    _doc: docText,
    _dispatched: [] as object[],
    _focused: false,
    state: {
      selection: { main: { from: 0, to: 0 } },
      doc: {
        toString: () => view._doc,
        length: docText.length,
        lineAt: (pos: number) => {
          const lines = view._doc.split('\n');
          let offset = 0;
          for (const line of lines) {
            if (pos <= offset + line.length) {
              return { text: line, from: offset, to: offset + line.length };
            }
            offset += line.length + 1;
          }
          return { text: '', from: offset, to: offset };
        },
        sliceString: (from: number, to: number) => view._doc.slice(from, to),
      },
    },
    dispatch: (tx: object) => { view._dispatched.push(tx); },
    focus: () => { view._focused = true; },
    dom: document.createElement('div'),
  };
  return view;
}

describe('useEditorContextActions', () => {
  let cmViewRef: { current: ReturnType<typeof makeEditorView> | null };
  let handleFormatAction: ReturnType<typeof vi.fn>;
  let setEditingTable: ReturnType<typeof vi.fn>;
  let setEditorCtxMenu: ReturnType<typeof vi.fn>;

  const render = () =>
    renderHook(() =>
      useEditorContextActions({
        cmViewRef: cmViewRef as never,
        handleFormatAction,
        setEditingTable,
        setEditorCtxMenu,
      }),
    );

  beforeEach(() => {
    cmViewRef = { current: makeEditorView('hello world') };
    handleFormatAction = vi.fn();
    setEditingTable = vi.fn();
    setEditorCtxMenu = vi.fn();
    // stub clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('pasted'),
      },
    });
  });

  it('returns handleEditorCtxAction function', () => {
    const { result } = render();
    expect(typeof result.current.handleEditorCtxAction).toBe('function');
  });

  it('does nothing when cmViewRef.current is null', () => {
    cmViewRef.current = null;
    const { result } = render();
    expect(() => act(() => result.current.handleEditorCtxAction('bold'))).not.toThrow();
    expect(handleFormatAction).not.toHaveBeenCalled();
  });

  describe('clipboard actions', () => {
    it('copy calls clipboard.writeText with selected text', async () => {
      const view = makeEditorView('hello world');
      view.state.selection.main.from = 0;
      view.state.selection.main.to = 5;
      cmViewRef.current = view;
      const { result } = render();

      await act(async () => result.current.handleEditorCtxAction('copy'));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
      expect(setEditorCtxMenu).toHaveBeenCalledWith(null);
    });

    it('cut removes selected text and writes to clipboard', async () => {
      const view = makeEditorView('hello world');
      view.state.selection.main.from = 0;
      view.state.selection.main.to = 5;
      cmViewRef.current = view;
      const { result } = render();

      await act(async () => result.current.handleEditorCtxAction('cut'));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
      expect(view._dispatched).toHaveLength(1);
      expect(setEditorCtxMenu).toHaveBeenCalledWith(null);
    });

    it('selectAll dispatches anchor=0, head=doc.length', async () => {
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('selectAll'));
      const view = cmViewRef.current!;
      expect(view._dispatched).toHaveLength(1);
      expect((view._dispatched[0] as { selection: { anchor: number; head: number } }).selection).toEqual({
        anchor: 0,
        head: 'hello world'.length,
      });
    });
  });

  describe('format actions delegated to handleFormatAction', () => {
    const delegated = ['bold', 'italic', 'strikethrough', 'code', 'heading', 'blockquote', 'ul', 'ol', 'link', 'image', 'image-link'];
    for (const action of delegated) {
      it(`delegates '${action}' to handleFormatAction`, () => {
        const { result } = render();
        act(() => result.current.handleEditorCtxAction(action));
        expect(handleFormatAction).toHaveBeenCalledWith(action);
      });
    }
  });

  describe('heading manipulation', () => {
    it('headingPromote reduces heading level', () => {
      const view = makeEditorView('## Section');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('headingPromote'));
      expect(view._dispatched).toHaveLength(1);
      const tx = view._dispatched[0] as { changes: { insert: string } };
      expect(tx.changes.insert).toBe('# ');
    });

    it('headingPromote does nothing on H1', () => {
      const view = makeEditorView('# Title');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('headingPromote'));
      expect(view._dispatched).toHaveLength(0);
    });

    it('headingDemote increases heading level', () => {
      const view = makeEditorView('# Title');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('headingDemote'));
      const tx = view._dispatched[0] as { changes: { insert: string } };
      expect(tx.changes.insert).toBe('## ');
    });

    it('headingDemote adds H2 to plain paragraph', () => {
      const view = makeEditorView('plain text');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('headingDemote'));
      const tx = view._dispatched[0] as { changes: { insert: string } };
      expect(tx.changes.insert).toBe('## ');
    });

    it('headingRemove strips heading prefix', () => {
      const view = makeEditorView('### Section');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('headingRemove'));
      const tx = view._dispatched[0] as { changes: { insert: string } };
      expect(tx.changes.insert).toBe('');
    });
  });

  describe('outdent', () => {
    it('removes 2-space indent', () => {
      const view = makeEditorView('  indented');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('outdent'));
      expect(view._dispatched).toHaveLength(1);
    });

    it('removes unordered list prefix', () => {
      const view = makeEditorView('- item');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('outdent'));
      expect(view._dispatched).toHaveLength(1);
    });
  });

  describe('toggleListType', () => {
    it('converts unordered list to ordered', () => {
      const view = makeEditorView('- item');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('toggleListType'));
      const tx = view._dispatched[0] as { changes: { insert: string } };
      expect(tx.changes.insert).toBe('1. ');
    });

    it('converts ordered list to unordered', () => {
      const view = makeEditorView('1. item');
      cmViewRef.current = view;
      const { result } = render();
      act(() => result.current.handleEditorCtxAction('toggleListType'));
      const tx = view._dispatched[0] as { changes: { insert: string } };
      expect(tx.changes.insert).toBe('- ');
    });
  });

  it('default action closes menu and focuses view', () => {
    const { result } = render();
    act(() => result.current.handleEditorCtxAction('unknown-action'));
    expect(setEditorCtxMenu).toHaveBeenCalledWith(null);
    expect(cmViewRef.current!._focused).toBe(true);
  });
});
