/**
 * AppContextMenus — renders all context menus and inline modal overlays.
 *
 * Reads editorCtxMenu / previewCtxMenu directly from UIStore so AppShell
 * doesn't need to select or thread those values. InputDialog and TableEditor
 * state comes from useEditorCore via props.
 */
import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { TableData } from '../../lib/markdown';
import type { InputDialogState } from '../../hooks/useInputDialog';
import { useUIStore, useEditorStore } from '../../stores';
import { EditorContextMenu } from './EditorContextMenu';
import { PreviewContextMenu } from '../preview/PreviewContextMenu';
import { TableEditor } from '../modal/TableEditor';
import { InputDialog } from '../modal/InputDialog';
import { milkdownBridge } from '../../lib/milkdown/editor-bridge';
import { AI_TOOLBAR_EVENT } from '../milkdown/ai-toolbar-bridge';
import type { AIToolbarEventDetail } from '../milkdown/ai-toolbar-bridge';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInHeadingCommand,
} from '@milkdown/kit/preset/commonmark';
import { toggleLinkCommand } from '@milkdown/kit/component/link-tooltip';

interface AppContextMenusProps {
  inputDialogState: InputDialogState | null;
  setInputDialogState: (v: InputDialogState | null) => void;
  editingTable: TableData | null;
  setEditingTable: (t: TableData | null) => void;
  handleTableConfirm: (markdown: string) => void;
  cmViewRef: RefObject<EditorView | null>;
  handleEditorCtxAction: (action: string) => void;
  previewRef: RefObject<HTMLDivElement | null>;
  wysiwygMode?: boolean;
}

export function AppContextMenus({
  inputDialogState, setInputDialogState,
  editingTable, setEditingTable, handleTableConfirm,
  cmViewRef, handleEditorCtxAction, previewRef,
  wysiwygMode = false,
}: AppContextMenusProps) {
  const editorCtxMenu = useUIStore((s) => s.editorCtxMenu);
  const setEditorCtxMenu = useUIStore((s) => s.setEditorCtxMenu);
  const previewCtxMenu = useUIStore((s) => s.previewCtxMenu);
  const setPreviewCtxMenu = useUIStore((s) => s.setPreviewCtxMenu);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  // Map preview context menu action IDs to AI toolbar commands
  const AI_ACTION_MAP: Record<string, AIToolbarEventDetail['command']> = {
    aiPolish: '/polish',
    aiRewrite: '/rewrite',
    aiTranslate: '/translate',
    aiSummarize: '/summarize',
  };

  // Map formatting action IDs to Milkdown command keys
  const FORMATTING_COMMANDS: Record<string, unknown> = {
    bold: toggleStrongCommand.key,
    italic: toggleEmphasisCommand.key,
    link: toggleLinkCommand.key,
  };

  const handlePreviewAction = useCallback((action: string) => {
    setPreviewCtxMenu(null);
    switch (action) {
      case 'copy':
        document.execCommand('copy');
        break;
      case 'copyAsMarkdown': {
        const sel = window.getSelection()?.toString() ?? '';
        if (sel) navigator.clipboard.writeText(sel).catch(() => {});
        break;
      }
      case 'selectAll': {
        const preview = previewRef.current;
        if (preview) {
          const range = document.createRange();
          range.selectNodeContents(preview);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        break;
      }
      case 'viewSource':
        setViewMode('edit');
        break;
      case 'headingPromote':
        // Promote = lower level number (h3 → h2). Use wrapInHeadingCommand with level 1
        // as a simple approach — converts current block to h1.
        milkdownBridge.runCommand?.(wrapInHeadingCommand.key, 1);
        break;
      case 'headingDemote':
        milkdownBridge.runCommand?.(wrapInHeadingCommand.key, 2);
        break;
      case 'headingRemove':
        // Level 0 converts heading to paragraph
        milkdownBridge.runCommand?.(wrapInHeadingCommand.key, 0);
        break;
      case 'image':
        // Image insertion in WYSIWYG not yet supported via context menu
        break;
      default: {
        // AI actions → dispatch ai-toolbar-action event (handled by AI Copilot plugin)
        const aiCommand = AI_ACTION_MAP[action];
        if (aiCommand) {
          document.dispatchEvent(
            new CustomEvent<AIToolbarEventDetail>(AI_TOOLBAR_EVENT, {
              detail: { command: aiCommand },
            }),
          );
          return;
        }
        // Formatting actions → execute Milkdown ProseMirror commands via bridge
        const commandKey = FORMATTING_COMMANDS[action];
        if (commandKey && milkdownBridge.runCommand) {
          milkdownBridge.runCommand(commandKey);
          return;
        }
        break;
      }
    }
  }, [previewRef, setPreviewCtxMenu, setViewMode]);

  return (
    <>
      {inputDialogState && (
        <InputDialog
          visible={true}
          {...inputDialogState.config}
          onConfirm={(value) => { inputDialogState.resolve(value); setInputDialogState(null); }}
          onCancel={() => { inputDialogState.resolve(null); setInputDialogState(null); }}
        />
      )}

      {editorCtxMenu && (
        <EditorContextMenu
          visible={!!editorCtxMenu}
          x={editorCtxMenu.x} y={editorCtxMenu.y}
          context={editorCtxMenu.context}
          hasSelection={(() => {
            const view = cmViewRef.current;
            if (!view) return false;
            const sel = view.state.selection.main;
            return sel.from !== sel.to;
          })()}
          onClose={() => setEditorCtxMenu(null)}
          onAction={handleEditorCtxAction}
        />
      )}

      {previewCtxMenu && (
        <PreviewContextMenu
          visible={!!previewCtxMenu}
          x={previewCtxMenu.x} y={previewCtxMenu.y}
          hasSelection={!!window.getSelection()?.toString()}
          wysiwygMode={wysiwygMode}
          onClose={() => setPreviewCtxMenu(null)}
          onAction={handlePreviewAction}
        />
      )}

      {editingTable && (
        <TableEditor table={editingTable} onConfirm={handleTableConfirm} onCancel={() => setEditingTable(null)} />
      )}
    </>
  );
}
