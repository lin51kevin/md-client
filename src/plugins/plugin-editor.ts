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
    /**
     * Get the full text content of the currently active editor.
     * @returns The editor document as a string, or empty string if no editor is available.
     *
     * @example
     * ```ts
     * const content = ctx.editor.getContent();
     * console.log('Document length:', content.length);
     * ```
     */
    getContent(): string {
      const view = deps.cmViewRef.current;
      return view ? view.state.doc.toString() : '';
    },
    /**
     * Insert text at a specific position, or replace the current selection.
     * After insertion, the cursor is placed at the end of the inserted text.
     *
     * @param text - The text to insert.
     * @param from - Start position (default: current selection start).
     * @param to - End position (default: current selection end).
     *
     * @example
     * ```ts
     * // Replace selection with text
     * ctx.editor.insertText('Hello, world!');
     * // Insert at a specific position
     * ctx.editor.insertText('TODO', 10, 15);
     * ```
     */
    insertText(text: string, from?: number, to?: number): void {
      const view = deps.cmViewRef.current;
      if (!view) return;
      const { from: f, to: t } = view.state.selection.main;
      view.dispatch({
        changes: { from: from ?? f, to: to ?? t, insert: text },
        selection: { anchor: (from ?? f) + text.length },
      });
    },
    /**
     * Get the file path of the currently active tab.
     * @returns Absolute file path, or null if no file is open.
     *
     * @example
     * ```ts
     * const path = ctx.editor.getActiveFilePath();
     * if (path) console.log('Editing:', path);
     * ```
     */
    getActiveFilePath(): string | null {
      return deps.getActiveTab?.()?.path ?? null;
    },
  };
}