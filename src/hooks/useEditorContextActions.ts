/**
 * useEditorContextActions — 编辑器右键菜单操作处理器
 *
 * 将原 App.tsx 中 200+ 行的 handleEditorCtxAction switch 提取为独立 hook，
 * 降低 App.tsx 复杂度，提升可测试性。
 */
import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { EditorView } from '@codemirror/view';
import { parseTable, serializeTable, type TableData } from '../lib/markdown';
import type { ContextInfo } from '../lib/editor';

interface UseEditorContextActionsParams {
  cmViewRef: MutableRefObject<EditorView | null>;
  handleFormatAction: (action: string) => void;
  setEditingTable: (table: TableData | null) => void;
  setEditorCtxMenu: (menu: { x: number; y: number; context: ContextInfo } | null) => void;
}

export function useEditorContextActions({
  cmViewRef,
  handleFormatAction,
  setEditingTable,
  setEditorCtxMenu,
}: UseEditorContextActionsParams) {
  const handleEditorCtxAction = useCallback(
    (action: string) => {
      const view = cmViewRef.current;
      if (!view) return;

      switch (action) {
        case 'cut': {
          const cutSel = view.state.selection.main;
          const cutText = view.state.doc.sliceString(cutSel.from, cutSel.to);
          navigator.clipboard.writeText(cutText).catch(() => {});
          if (cutSel.from !== cutSel.to) {
            view.dispatch({ changes: { from: cutSel.from, to: cutSel.to, insert: '' } });
          }
          break;
        }
        case 'copy': {
          const copySel = view.state.selection.main;
          navigator.clipboard
            .writeText(view.state.doc.sliceString(copySel.from, copySel.to))
            .catch(() => {});
          break;
        }
        case 'paste':
          navigator.clipboard.readText().then((text) => {
            if (!text) return;
            const sel = view.state.selection.main;
            view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
          });
          break;
        case 'selectAll':
          view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
          break;
        case 'bold':
        case 'italic':
        case 'strikethrough':
        case 'code':
        case 'heading':
        case 'blockquote':
        case 'ul':
        case 'ol':
        case 'link':
        case 'image':
        case 'image-link':
          handleFormatAction(action);
          break;
        case 'headingPromote': {
          const sel = view.state.selection.main;
          const line = view.state.doc.lineAt(sel.from);
          const m = line.text.match(/^(#{1,6})/);
          const level = m?.[1]?.length ?? 1;
          if (level > 1) {
            view.dispatch({
              changes: {
                from: line.from,
                to: line.from + level,
                insert: '#'.repeat(level - 1) + ' ',
              },
            });
          }
          break;
        }
        case 'headingDemote': {
          const sel = view.state.selection.main;
          const line = view.state.doc.lineAt(sel.from);
          const m = line.text.match(/^(#{1,6})/);
          const level = m?.[1]?.length ?? 0;
          if (level >= 1 && level < 6) {
            view.dispatch({
              changes: {
                from: line.from,
                to: line.from + level,
                insert: '#'.repeat(level + 1) + ' ',
              },
            });
          } else if (level === 0 || !m) {
            view.dispatch({ changes: { from: line.from, insert: '## ' } });
          }
          break;
        }
        case 'headingRemove': {
          const sel = view.state.selection.main;
          const line = view.state.doc.lineAt(sel.from);
          const m = line.text.match(/^(#{1,6}\s*)/);
          if (m) {
            view.dispatch({
              changes: { from: line.from, to: line.from + m[1].length, insert: '' },
            });
          }
          break;
        }
        case 'copyCodeBlock': {
          const doc = view.state.doc.toString();
          const sel = view.state.selection.main;
          let start = sel.from;
          let end = sel.to;
          while (start > 0 && doc.substring(start - 3, start) !== '```') start--;
          while (end < doc.length && doc.substring(end, end + 3) !== '```') end++;
          if (
            start < end &&
            doc.substring(start, start + 3) === '```' &&
            doc.substring(end, end + 3) === '```'
          ) {
            const codeContent = doc
              .substring(start + (doc.indexOf('\n', start) + 1), end)
              .trim();
            navigator.clipboard.writeText(codeContent);
          } else {
            navigator.clipboard
              .writeText(view.state.doc.sliceString(sel.from, sel.to))
              .catch(() => {});
          }
          break;
        }
        case 'indent':
          handleFormatAction('ul');
          break;
        case 'outdent': {
          const sel = view.state.selection.main;
          const line = view.state.doc.lineAt(sel.from);
          const lt = line.text;
          if (/^\s{2}/.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: line.from + 2, insert: '' } });
          } else if (/^[-*+] /.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: line.from + 2, insert: '' } });
          } else if (/^\d+\. /.test(lt)) {
            view.dispatch({
              changes: { from: line.from, to: lt.indexOf(' ') + 1, insert: '' },
            });
          }
          break;
        }
        case 'toggleListType': {
          const sel = view.state.selection.main;
          const line = view.state.doc.lineAt(sel.from);
          const lt = line.text;
          if (/^[-*+] /.test(lt)) {
            view.dispatch({ changes: { from: line.from, to: line.from + 2, insert: '1. ' } });
          } else if (/^\d+\. /.test(lt)) {
            view.dispatch({
              changes: { from: line.from, to: lt.indexOf('.') + 2, insert: '- ' },
            });
          }
          break;
        }
        case 'removeBlockquote':
          handleFormatAction('blockquote');
          break;
        case 'editTable': {
          const doc = view.state.doc.toString();
          const sel = view.state.selection.main;
          const tableData = parseTable(doc, sel.from);
          if (tableData) setEditingTable(tableData);
          // Return early — don't close the menu via the path below
          setEditorCtxMenu(null);
          view.focus();
          return;
        }
        case 'tableInsertRow':
        case 'tableDeleteRow':
        case 'tableInsertCol':
        case 'tableDeleteCol':
        case 'alignLeft':
        case 'alignCenter':
        case 'alignRight': {
          const doc = view.state.doc.toString();
          const sel = view.state.selection.main;
          const tableData = parseTable(doc, sel.from);
          if (!tableData) break;

          const textBefore = doc.substring(tableData.rawStart, sel.from);
          const cursorLineInTable = textBefore.split('\n').length - 1;
          const rowIdx = Math.max(0, cursorLineInTable - 2);

          const cursorLine = view.state.doc.lineAt(sel.from);
          const textBeforeCursor = cursorLine.text.substring(0, sel.from - cursorLine.from);
          const colIdx = Math.max(0, (textBeforeCursor.match(/\|/g) ?? []).length - 1);

          const headers = [tableData.headers[0]?.map((c) => c) ?? []];
          let rows = tableData.rows.map((r) => [...r]);
          let alignment = [...tableData.alignment];
          const colCount = headers[0].length;

          switch (action) {
            case 'tableInsertRow':
              rows.splice(rowIdx + 1, 0, Array(colCount).fill(''));
              break;
            case 'tableDeleteRow':
              if (rows.length > 1) rows.splice(rowIdx, 1);
              break;
            case 'tableInsertCol':
              headers[0].splice(colIdx + 1, 0, '');
              rows = rows.map((r) => {
                const nr = [...r];
                nr.splice(colIdx + 1, 0, '');
                return nr;
              });
              alignment.splice(colIdx + 1, 0, 'left' as const);
              break;
            case 'tableDeleteCol':
              if (headers[0].length > 1) {
                headers[0].splice(colIdx, 1);
                rows = rows.map((r) => {
                  const nr = [...r];
                  nr.splice(colIdx, 1);
                  return nr;
                });
                alignment.splice(colIdx, 1);
              }
              break;
            case 'alignLeft':
              alignment[colIdx] = 'left';
              break;
            case 'alignCenter':
              alignment[colIdx] = 'center';
              break;
            case 'alignRight':
              alignment[colIdx] = 'right';
              break;
          }

          const newTable = serializeTable({
            headers,
            rows,
            alignment,
            rawStart: tableData.rawStart,
            rawEnd: tableData.rawEnd,
          });
          view.dispatch({
            changes: { from: tableData.rawStart, to: tableData.rawEnd - 1, insert: newTable },
          });
          break;
        }
        case 'copyFormula': {
          const doc = view.state.doc.toString();
          const sel = view.state.selection.main;
          const pos = sel.from;
          const blockStart = doc.lastIndexOf('$$', pos - 1);
          const blockEnd = doc.indexOf('$$', pos + 1);
          if (blockStart !== -1 && blockEnd !== -1 && blockStart !== blockEnd) {
            navigator.clipboard.writeText(doc.substring(blockStart + 2, blockEnd).trim());
          } else {
            const line = view.state.doc.lineAt(pos);
            const relPos = pos - line.from;
            for (const m of line.text.matchAll(/\$([^$]+)\$/g)) {
              if (m.index !== undefined && m.index <= relPos && m.index + m[0].length >= relPos) {
                navigator.clipboard.writeText(m[1]);
                break;
              }
            }
          }
          break;
        }
        default:
          break;
      }

      setEditorCtxMenu(null);
      view.focus();
    },
    [cmViewRef, handleFormatAction, setEditingTable, setEditorCtxMenu],
  );

  return { handleEditorCtxAction };
}
