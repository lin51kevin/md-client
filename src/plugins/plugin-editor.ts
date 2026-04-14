import type { EditorView } from '@codemirror/view';
import type { PluginContext } from './plugin-sandbox';

/**
 * Dependencies required by the editor API.
 */
export interface EditorAPIDeps {
  /** React ref holding the current CodeMirror EditorView instance. */
  cmViewRef: React.RefObject<EditorView | null>;
  /** Optional: returns the currently active tab (path + content). */
  getActiveTab?: () => { path: string | null; content: string } | null;
}

/**
 * Create the editor API for plugin contexts.
 * Provides read/write access to the editor document and cursor.
 *
 * @param deps - Editor dependencies (CodeMirror view ref, active tab getter).
 * @returns The editor portion of the plugin context.
 */
export function createEditorAPI(deps: EditorAPIDeps): PluginContext['editor'] {
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
      return deps.getActiveTab?.()?.path ?? null;
    },
  };
}