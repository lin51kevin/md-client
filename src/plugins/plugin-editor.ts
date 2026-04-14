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
     */
    getContent(): string {
      const view = deps.cmViewRef.current;
      return view ? view.state.doc.toString() : '';
    },
    /**
     * Get the current text selection in the editor.
     * @returns An object with from, to offsets and the selected text, or null if nothing is selected.
     */
    getSelection(): { from: number; to: number; text: string } | null {
      const view = deps.cmViewRef.current;
      if (!view) return null;
      const { from, to } = view.state.selection.main;
      if (from === to) return null;
      return { from, to, text: view.state.doc.sliceString(from, to) };
    },
    /**
     * Get the current cursor position in the editor.
     * @returns An object with line (1-based), column (1-based), and offset (0-based).
     */
    getCursorPosition(): { line: number; column: number; offset: number } {
      const view = deps.cmViewRef.current;
      if (!view) return { line: 1, column: 1, offset: 0 };
      const head = view.state.selection.main.head;
      const line = view.state.doc.lineAt(head);
      return { line: line.number, column: head - line.from + 1, offset: head };
    },
    /**
     * Insert text at a specific position, or replace the current selection.
     * After insertion, the cursor is placed at the end of the inserted text.
     *
     * @param text - The text to insert.
     * @param from - Start position (default: current selection start).
     * @param to - End position (default: current selection end).
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
     * Replace a range of text in the editor.
     * @param from - Start offset (0-based).
     * @param to - End offset (0-based).
     * @param text - The replacement text.
     */
    replaceRange(from: number, to: number, text: string): void {
      const view = deps.cmViewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
    },
    /**
     * Get the file path of the currently active tab.
     * @returns Absolute file path, or null if no file is open.
     */
    getActiveFilePath(): string | null {
      return deps.getActiveTab?.()?.path ?? null;
    },
  };
}