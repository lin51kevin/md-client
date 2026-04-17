/**
 * 多光标编辑增强 - CodeMirror 6 keymap
 *
 * 提供以下快捷键：
 * - Alt+D: 选中所有相同词 (Select All Occurrences)
 * - Alt+Up: 在上方添加光标 (Add Cursor Above)
 * - Alt+Down: 在下方添加光标 (Add Cursor Below)
 */

import { keymap, EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

/** 查找文档中所有出现的词，返回 [from, to] 区间数组 */
function findAllOccurrences(docText: string, word: string): number[][] {
  const ranges: number[][] = [];
  // [W3 FIX] Guard against ReDoS: reject overly long selections (>100 chars)
  if (word.length > 100) return [];
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(docText)) !== null) {
    ranges.push([match.index, match.index + word.length]);
  }
  return ranges;
}

export function multicursorKeymap(): Extension {
  return keymap.of([
    {
      key: 'Alt-d',
      run(view: EditorView) {
        const selection = view.state.selection.main;
        const selectedText = view.state.doc.sliceString(selection.from, selection.to);
        if (!selectedText || selectedText.includes('\n')) return false;

        const allRanges = findAllOccurrences(view.state.doc.toString(), selectedText);
        if (allRanges.length <= 1) return false;

        view.dispatch({
          selection: EditorSelection.create(
            allRanges.map(([f, t]) => EditorSelection.range(f, t))
          ),
        });
        return true;
      },
    },
    {
      key: 'Alt-ArrowUp',
      run(view: EditorView) {
        const ranges = view.state.selection.ranges;
        const newRanges = [...ranges];

        for (const r of ranges) {
          const line = view.state.doc.lineAt(r.head);
          if (line.number > 1) {
            const prevLine = view.state.doc.line(line.number - 1);
            const col = r.head - line.from;
            const newPos = Math.min(prevLine.from + col, prevLine.to);
            newRanges.push(EditorSelection.cursor(newPos));
          }
        }

        if (newRanges.length === ranges.length) return false;

        view.dispatch({
          selection: EditorSelection.create(newRanges),
          effects: EditorView.scrollIntoView(newRanges[newRanges.length - 1].anchor, { y: 'start' }),
        });
        return true;
      },
    },
    {
      key: 'Alt-ArrowDown',
      run(view: EditorView) {
        const ranges = view.state.selection.ranges;
        const newRanges = [...ranges];
        const lastLineNum = view.state.doc.lines;

        for (const r of ranges) {
          const line = view.state.doc.lineAt(r.head);
          if (line.number < lastLineNum) {
            const nextLine = view.state.doc.line(line.number + 1);
            const col = r.head - line.from;
            const newPos = Math.min(nextLine.from + col, nextLine.to);
            newRanges.push(EditorSelection.cursor(newPos));
          }
        }

        if (newRanges.length === ranges.length) return false;

        view.dispatch({
          selection: EditorSelection.create(newRanges),
          effects: EditorView.scrollIntoView(newRanges[newRanges.length - 1].anchor, { y: 'end' }),
        });
        return true;
      },
    },
  ]);
}
