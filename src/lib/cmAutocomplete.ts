import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { getAutoCompletion, type CompletionResult } from './autocomplete';

/**
 * CodeMirror 6 扩展：Markdown 自动补全
 * 
 * 使用 inputHandler 在字符插入后自动补全闭合符号：
 * - [] () {} `` "" ''
 * - **（粗体） *（斜体）
 */
export function autoCloseBrackets(): Extension {
  return EditorView.inputHandler.of((view: EditorView, from: number, to: number, text: string) => {
    // 只处理单字符输入
    if (text.length !== 1) return false;
    
    // 有选中文本时让默认行为接管
    if (from !== to - 1) return false;

    const cursorPos = to;
    const line = view.state.doc.lineAt(cursorPos);
    const cursorPosInLine = cursorPos - line.from;
    
    const result: CompletionResult | null = getAutoCompletion(line.text, cursorPosInLine);
    if (!result) return false;

    if (result.insertedText) {
      view.dispatch({
        changes: { from: to, insert: result.insertedText },
        selection: { anchor: to + result.cursorOffset },
      });
    } else {
      view.dispatch({
        selection: { anchor: to + result.cursorOffset },
      });
    }
    
    return true;
  });
}
