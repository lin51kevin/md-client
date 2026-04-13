import type { EditorView } from '@codemirror/view';

export function createEditorAPI(deps: { cmViewRef: React.RefObject<EditorView | null> }): Record<string, (...args: unknown[]) => unknown> {
  return {
    getContent(): string {
      const view = deps.cmViewRef.current;
      return view ? view.state.doc.toString() : '';
    },
    insertText(text: string, from?: number, to?: number): void {
      const view = deps.cmViewRef.current;
      if (!view) return;
      const { from: f, to: t } = view.state.selection.main;
      view.dispatch({
        changes: { from: from ?? f, to: to ?? t, insert: text },
        selection: { anchor: (from ?? f) + text.length },
      });
    },
    getActiveFilePath(): string | null {
      return null;
    },
  };
}
