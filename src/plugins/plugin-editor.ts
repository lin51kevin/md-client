import type { EditorView } from '@codemirror/view';
import type { PluginContext } from './plugin-sandbox';
import { milkdownBridge } from '../lib/milkdown/editor-bridge';

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
     * Prefers Milkdown content (via getActiveTab) when Milkdown has focus or
     * CodeMirror is not rendered (preview-only mode); falls back to CodeMirror.
     */
    getContent(): string {
      if (milkdownBridge.hasFocus) {
        const tab = deps.getActiveTab?.();
        if (tab != null) return tab.content;
      }
      const view = deps.cmViewRef.current;
      if (view) return view.state.doc.toString();
      // Fallback: tab content handles preview-only mode where CodeMirror is unmounted.
      return deps.getActiveTab?.()?.content ?? '';
    },

    /**
     * Get the current text selection.
     * Returns Milkdown selection (markdown offsets) when the Milkdown pane is
     * focused; otherwise returns the CodeMirror selection.
     */
    getSelection(): { from: number; to: number; text: string } | null {
      if (milkdownBridge.hasFocus) {
        return milkdownBridge.selection;
      }
      const view = deps.cmViewRef.current;
      if (!view) return null;
      const { from, to } = view.state.selection.main;
      if (from === to) return null;
      return { from, to, text: view.state.doc.sliceString(from, to) };
    },

    /**
     * Get the current cursor position.
     * Uses Milkdown cursor data when the Milkdown pane is focused.
     */
    getCursorPosition(): { line: number; column: number; offset: number } {
      if (milkdownBridge.hasFocus) {
        const offset = milkdownBridge.selection?.from ?? milkdownBridge.cursorOffset;
        const md = deps.getActiveTab?.()?.content ?? '';
        const before = md.slice(0, offset);
        const lines = before.split('\n');
        return {
          line: lines.length,
          column: (lines[lines.length - 1]?.length ?? 0) + 1,
          offset,
        };
      }
      const view = deps.cmViewRef.current;
      if (!view) return { line: 1, column: 1, offset: 0 };
      const head = view.state.selection.main.head;
      const line = view.state.doc.lineAt(head);
      return { line: line.number, column: head - line.from + 1, offset: head };
    },

    /**
     * Insert text at a specific position, or replace the current selection.
     * Routes through the Milkdown bridge when the Milkdown pane is focused.
     */
    insertText(text: string, from?: number, to?: number): void {
      if (!milkdownBridge.hasFocus) {
        const view = deps.cmViewRef.current;
        if (view) {
          const { from: f, to: t } = view.state.selection.main;
          view.dispatch({
            changes: { from: from ?? f, to: to ?? t, insert: text },
            selection: { anchor: (from ?? f) + text.length },
          });
          return;
        }
      }
      // Milkdown / no-view path: apply to content string.
      // Use lastWrittenContent to support synchronous batch action sequences.
      const md = milkdownBridge.lastWrittenContent ?? deps.getActiveTab?.()?.content ?? '';
      const f = from ?? milkdownBridge.cursorOffset;
      const t = to ?? f;
      const newMd = md.slice(0, f) + text + md.slice(t);
      milkdownBridge.recordWrite(newMd);
      milkdownBridge.setContent?.(newMd);
    },

    /**
     * Replace a range of text in the editor.
     * Routes through the Milkdown bridge when the Milkdown pane is focused.
     */
    replaceRange(from: number, to: number, text: string): void {
      if (!milkdownBridge.hasFocus) {
        const view = deps.cmViewRef.current;
        if (view) {
          view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
          });
          return;
        }
      }
      // Milkdown / no-view path: apply to content string.
      const md = milkdownBridge.lastWrittenContent ?? deps.getActiveTab?.()?.content ?? '';
      const newMd = md.slice(0, from) + text + md.slice(to);
      milkdownBridge.recordWrite(newMd);
      milkdownBridge.setContent?.(newMd);
    },

    /**
     * Get the file path of the currently active tab.
     */
    getActiveFilePath(): string | null {
      return deps.getActiveTab?.()?.path ?? null;
    },
  };
}