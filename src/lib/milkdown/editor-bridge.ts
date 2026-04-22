/**
 * Bridge between MilkdownEditor (WYSIWYG preview pane) and plugin-editor.ts.
 *
 * MilkdownEditor writes selection/cursor state here whenever the user
 * interacts with the Milkdown pane.  plugin-editor.ts reads from the bridge
 * when Milkdown has focus so that AI Copilot operations target the correct
 * content and selection — even in preview-only mode where CodeMirror is not
 * rendered.
 */

export interface MilkdownSelectionState {
  /** Start character offset in the full markdown string (0-based). */
  from: number;
  /** End character offset in the full markdown string (0-based). */
  to: number;
  /** The selected text as it appears in the DOM (rendered, no markdown syntax). */
  text: string;
}

class MilkdownEditorBridgeStore {
  /** Selected region expressed as markdown char offsets. null when nothing selected. */
  selection: MilkdownSelectionState | null = null;

  /** Approximate cursor offset in the full markdown string. */
  cursorOffset = 0;

  /** True while the Milkdown container holds DOM focus. */
  hasFocus = false;

  /** Undo/redo state for WYSIWYG mode — updated by MilkdownEditor on each transaction. */
  private _canUndo = false;
  private _canRedo = false;

  get canUndo() { return this._canUndo; }
  get canRedo() { return this._canRedo; }

  /** Update both at once and notify subscribers. */
  setUndoRedo(canUndo: boolean, canRedo: boolean): void {
    if (this._canUndo === canUndo && this._canRedo === canRedo) return;
    this._canUndo = canUndo;
    this._canRedo = canRedo;
    this._notifyUndoRedo();
  }

  /** Bridge undo/redo to Milkdown's ProseMirror commands. */
  undo: (() => void) | null = null;
  redo: (() => void) | null = null;

  // Subscribers for undo/redo state changes
  private _undoRedoListeners: Array<(canUndo: boolean, canRedo: boolean) => void> = [];

  /** Subscribe to undo/redo state changes. Returns unsubscribe function. */
  onUndoRedoChange(listener: (canUndo: boolean, canRedo: boolean) => void): () => void {
    this._undoRedoListeners.push(listener);
    return () => {
      this._undoRedoListeners = this._undoRedoListeners.filter(l => l !== listener);
    };
  }

  /** Notify listeners (called by MilkdownEditor after updating canUndo/canRedo). */
  private _notifyUndoRedo(): void {
    for (const l of this._undoRedoListeners) l(this.canUndo, this.canRedo);
  }

  /**
   * Callback set by MilkdownEditor on mount.
   * Calling it triggers a full-document content update (→ updateActiveDoc →
   * Milkdown replaceAll), which is the write path for AI-generated edits.
   */
  setContent: ((content: string) => void) | null = null;

  /**
   * Run a named Milkdown command (e.g. toggleStrongCommand, toggleEmphasisCommand).
   * Set by MilkdownEditor when the Crepe instance is created.
   * @param commandKey - The command key (from @milkdown/kit/preset/commonmark etc.)
   * @param payload - Optional argument passed to the command
   */
  runCommand: ((commandKey: unknown, payload?: unknown) => void) | null = null;

  /**
   * Insert raw text at the current cursor position in the Milkdown ProseMirror editor.
   * Set by MilkdownEditor on mount; used by useImagePaste to insert image markdown
   * when WYSIWYG mode is active and CodeMirror is not rendered.
   */
  insertText: ((text: string) => void) | null = null;

  /**
   * Content from the most recent bridge write.
   * Supports batch action sequences where multiple replaceRange/insertText
   * calls are issued synchronously before React has re-rendered.
   * Auto-resets to null after 500 ms of inactivity.
   */
  private _lastWritten: string | null = null;
  private _resetTimer: ReturnType<typeof setTimeout> | null = null;

  get lastWrittenContent(): string | null {
    return this._lastWritten;
  }

  /** Record a write and schedule auto-reset after 500 ms of inactivity. */
  recordWrite(content: string): void {
    this._lastWritten = content;
    if (this._resetTimer) clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => {
      this._lastWritten = null;
      this._resetTimer = null;
    }, 500);
  }
}

/** Module-level singleton — one bridge per browser window. */
export const milkdownBridge = new MilkdownEditorBridgeStore();
