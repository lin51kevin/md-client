import { useMemo, useRef, useCallback } from 'react';
import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

/** A single search match range */
export interface SearchMatch {
  from: number;
  to: number;
}

// -- Effects to push match data into the editor state --
const setMatchesEffect = StateEffect.define<{
  matches: SearchMatch[];
  activeIndex: number;
}>();

// -- Decoration styles --
const matchMark = Decoration.mark({ class: 'cm-search-match' });
const activeMatchMark = Decoration.mark({ class: 'cm-search-match-active' });

// -- StateField that holds the current decorations --
const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decos, tr) {
    for (const e of tr.effects) {
      if (e.is(setMatchesEffect)) {
        const { matches, activeIndex } = e.value;
        if (matches.length === 0) return Decoration.none;

        const decorations = matches
          .filter((m) => m.from < tr.state.doc.length && m.to <= tr.state.doc.length)
          .map((m, i) =>
            (i === activeIndex ? activeMatchMark : matchMark).range(m.from, m.to),
          );

        return Decoration.set(decorations, true);
      }
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// -- Base theme for highlight colors --
const highlightTheme = EditorView.baseTheme({
  '.cm-search-match': {
    backgroundColor: 'rgba(255, 213, 0, 0.35)',
    borderRadius: '2px',
  },
  '.cm-search-match-active': {
    backgroundColor: 'rgba(255, 150, 0, 0.55)',
    borderRadius: '2px',
    outline: '1px solid rgba(255, 150, 0, 0.8)',
  },
});

/**
 * Hook that provides a CodeMirror extension for highlighting search results
 * and a function to push new match data into the editor.
 */
export function useSearchHighlight() {
  const viewRef = useRef<EditorView | null>(null);

  // Capture the EditorView on creation
  const capturePlugin = useMemo(
    () =>
      ViewPlugin.define((view) => {
        viewRef.current = view;
        return {
          update(_update: ViewUpdate) {},
          destroy() {
            viewRef.current = null;
          },
        };
      }),
    [],
  );

  const extension = useMemo(
    () => [highlightField, highlightTheme, capturePlugin],
    [capturePlugin],
  );

  /** Push match positions + active index into the editor. Also scrolls to active match. */
  const setMatches = useCallback(
    (matches: SearchMatch[], activeIndex: number) => {
      const view = viewRef.current;
      if (!view) return;

      view.dispatch({
        effects: setMatchesEffect.of({ matches, activeIndex }),
      });

      // Scroll the active match into view
      if (activeIndex >= 0 && activeIndex < matches.length) {
        const match = matches[activeIndex];
        view.dispatch({
          selection: { anchor: match.from, head: match.to },
          scrollIntoView: true,
        });
      }
    },
    [],
  );

  /** Clear all highlights */
  const clearMatches = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setMatchesEffect.of({ matches: [], activeIndex: -1 }),
    });
  }, []);

  return { searchHighlightExtension: extension, setMatches, clearMatches };
}
