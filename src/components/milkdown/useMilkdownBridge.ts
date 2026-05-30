import { useEffect, useRef } from 'react';
import { editorViewCtx, commandsCtx } from '@milkdown/core';
import { undoDepth, redoDepth, undo as pmUndo, redo as pmRedo } from 'prosemirror-history';
import {
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  liftListItemCommand,
  liftFirstListItemCommand,
} from '@milkdown/preset-commonmark';
import { insert, replaceAll } from '@milkdown/kit/utils';
import { Crepe } from '@milkdown/crepe';
import type { RefObject } from 'react';
import { milkdownBridge } from '../../lib/milkdown/editor-bridge';
import { findTextInMarkdown, computeCursorOffset } from './selection-helpers';

/**
 * Sets up the AI Copilot bridge:
 * - undo/redo commands
 * - runCommand (context menu formatting)
 * - setContent callback
 * - insertText (markdown insertion)
 * - focus tracking
 * - DOM selection → markdown offsets
 */
export function useMilkdownBridge(
  crepeRef: RefObject<Crepe | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  contentRef: RefObject<string>,
  onContentChangeRef: RefObject<((c: string) => void) | undefined>,
  hasUserInteractedRef: RefObject<boolean>,
  isExternalUpdateRef: RefObject<boolean>,
  lastContentRef: RefObject<string>,
) {
  // ── Bridge setup: undo/redo, runCommand, setContent, insertText, focus ───────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    milkdownBridge.setContent = (newContent: string) => {
      onContentChangeRef.current?.(newContent);
    };

    milkdownBridge.insertText = (markdown: string) => {
      const crepe = crepeRef.current;
      if (!crepe) return;
      try {
        hasUserInteractedRef.current = true;
        const view = crepe.editor.ctx.get(editorViewCtx);
        if (!view.hasFocus()) view.focus();
        crepe.editor.action(insert(markdown));
      } catch (err) {
        console.warn('[milkdown-bridge] insertText failed:', err);
      }
    };

    milkdownBridge.forceReplaceContent = (fullContent: string) => {
      const crepe = crepeRef.current;
      if (!crepe) return;
      try {
        // Strip frontmatter to get the body Milkdown renders
        const body = fullContent.replace(/^---[\s\S]*?---\n?/, '').replace(/^\n+/, '');
        // Directly replace Milkdown editor content (bypasses hasUserInteracted guard)
        isExternalUpdateRef.current = true;
        crepe.editor.action(replaceAll(body));
        lastContentRef.current = body;
        queueMicrotask(() => { isExternalUpdateRef.current = false; });
        // Also update React state so activeTab.doc stays in sync
        onContentChangeRef.current?.(fullContent);
      } catch (e) {
        console.warn('[milkdown-bridge] forceReplaceContent failed:', e);
      }
    };

    const onFocusIn = () => { milkdownBridge.hasFocus = true; };
    const onFocusOut = (e: FocusEvent) => {
      if (!container.contains(e.relatedTarget as Node | null)) {
        milkdownBridge.hasFocus = false;
      }
    };
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);

    return () => {
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      milkdownBridge.setContent = null;
      milkdownBridge.hasFocus = false;
      milkdownBridge.selection = null;
      milkdownBridge.undo = null;
      milkdownBridge.redo = null;
      milkdownBridge.runCommand = null;
      milkdownBridge.insertText = null;
      milkdownBridge.headingPromote = null;
      milkdownBridge.headingDemote = null;
      milkdownBridge.forceReplaceContent = null;
      milkdownBridge.toggleList = null;
      milkdownBridge.listLift = null;
      milkdownBridge.getContent = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Selection tracking: DOM selection → markdown offsets ─────────────────────
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode) return;
      if (!container.contains(sel.anchorNode)) return;

      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(() => {
        const fullContent = contentRef.current;
        const currentSel = window.getSelection();
        if (!currentSel || !currentSel.anchorNode || !container.contains(currentSel.anchorNode)) return;
        const text = currentSel.toString();

        if (text) {
          if (text.length > 1000) return;
          const from = findTextInMarkdown(fullContent, text, currentSel, container);
          milkdownBridge.selection = from >= 0
            ? { from, to: from + text.length, text }
            : null;
        } else {
          milkdownBridge.selection = null;
          if (currentSel.rangeCount > 0) {
            milkdownBridge.cursorOffset = computeCursorOffset(fullContent, currentSel, container);
          }
        }
      }, 100);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Called inside useEditor to set up undo/redo and runCommand on the bridge */
export function setupBridgeCommands(
  crepe: Crepe,
  hasUserInteractedRef: RefObject<boolean>,
  lastContentRef: RefObject<string>,
) {
  // Listen to ProseMirror transactions to sync undo/redo state
  crepe.on((listener) => {
    listener.updated(() => {
      try {
        const view = crepe.editor.ctx.get(editorViewCtx);
        milkdownBridge.setUndoRedo(
          undoDepth(view.state) > 0,
          redoDepth(view.state) > 0,
        );
      } catch { /* ctx not ready */ }
    });
  });

  milkdownBridge.undo = () => {
    try {
      const view = crepe.editor.ctx.get(editorViewCtx);
      pmUndo(view.state, view.dispatch);
    } catch { /* ignore */ }
  };

  milkdownBridge.redo = () => {
    try {
      const view = crepe.editor.ctx.get(editorViewCtx);
      pmRedo(view.state, view.dispatch);
    } catch { /* ignore */ }
  };

  milkdownBridge.runCommand = (commandKey: unknown, payload?: unknown) => {
    try {
      hasUserInteractedRef.current = true;
      const view = crepe.editor.ctx.get(editorViewCtx);
      if (!view.hasFocus()) view.focus();
      const commands = crepe.editor.ctx.get(commandsCtx);
      commands.call(commandKey as any, payload);
    } catch (e) {
      console.warn('[milkdown-bridge] runCommand failed:', e);
    }
  };

  milkdownBridge.headingPromote = () => {
    try {
      hasUserInteractedRef.current = true;
      const view = crepe.editor.ctx.get(editorViewCtx);
      if (!view.hasFocus()) view.focus();
      const { $from } = view.state.selection;
      const node = $from.node();
      if (node.type.name !== 'heading') return;
      const level: number = node.attrs.level;
      if (level <= 1) return; // already h1, can't promote further
      const commands = crepe.editor.ctx.get(commandsCtx);
      commands.call(wrapInHeadingCommand.key, level - 1);
    } catch (e) {
      console.warn('[milkdown-bridge] headingPromote failed:', e);
    }
  };

  milkdownBridge.headingDemote = () => {
    try {
      hasUserInteractedRef.current = true;
      const view = crepe.editor.ctx.get(editorViewCtx);
      if (!view.hasFocus()) view.focus();
      const { $from } = view.state.selection;
      const node = $from.node();
      const commands = crepe.editor.ctx.get(commandsCtx);
      if (node.type.name === 'heading') {
        const level: number = node.attrs.level;
        if (level >= 6) return; // already h6
        commands.call(wrapInHeadingCommand.key, level + 1);
      } else if (node.type.name === 'paragraph') {
        // paragraph → h2 (matching CodeMirror's 'headingDemote' which inserts '## ')
        commands.call(wrapInHeadingCommand.key, 2);
      }
    } catch (e) {
      console.warn('[milkdown-bridge] headingDemote failed:', e);
    }
  };

  milkdownBridge.getContent = () => lastContentRef.current;

  milkdownBridge.toggleList = (type: 'bullet' | 'ordered') => {
    try {
      hasUserInteractedRef.current = true;
      const view = crepe.editor.ctx.get(editorViewCtx);
      if (!view.hasFocus()) view.focus();
      const commands = crepe.editor.ctx.get(commandsCtx);

      // Walk the resolved position's ancestors to determine if we're already inside
      // a list of the same type.
      const { $from } = view.state.selection;
      let insideSameList = false;
      for (let depth = $from.depth; depth >= 0; depth--) {
        const nodeName = $from.node(depth).type.name;
        if (type === 'bullet' && nodeName === 'bullet_list') { insideSameList = true; break; }
        if (type === 'ordered' && nodeName === 'ordered_list') { insideSameList = true; break; }
      }

      if (insideSameList) {
        // Toggle off: try nested-lift first; fall back to liftFirstListItem
        const lifted = commands.call(liftListItemCommand.key);
        if (!lifted) commands.call(liftFirstListItemCommand.key);
      } else if (type === 'bullet') {
        commands.call(wrapInBulletListCommand.key);
      } else {
        commands.call(wrapInOrderedListCommand.key);
      }
    } catch (e) {
      console.warn('[milkdown-bridge] toggleList failed:', e);
    }
  };

  milkdownBridge.listLift = () => {
    try {
      hasUserInteractedRef.current = true;
      const view = crepe.editor.ctx.get(editorViewCtx);
      if (!view.hasFocus()) view.focus();
      const commands = crepe.editor.ctx.get(commandsCtx);
      // liftListItemCommand lifts nested items; liftFirstListItemCommand handles top-level
      const lifted = commands.call(liftListItemCommand.key);
      if (!lifted) commands.call(liftFirstListItemCommand.key);
    } catch (e) {
      console.warn('[milkdown-bridge] listLift failed:', e);
    }
  };
}
