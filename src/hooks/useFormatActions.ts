import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { Tab } from '../types';
import {
  wrapSelection,
  toggleLinePrefix,
  insertLink,
  insertImage,
  type SelectionInfo,
  type FormatResult,
} from '../lib/text-format';
import { getImageSaveDir, generateImageFileName } from '../lib/image-paste';
import { addPendingImage } from '../lib/pending-images';

import type { InputDialogConfig } from '../components/InputDialog';

interface UseFormatActionsParams {
  cmViewRef: MutableRefObject<EditorView | null>;
  getActiveTab: () => Tab;
  /** Promise-based user-input callback replacing window.prompt */
  promptUser: (config: InputDialogConfig) => Promise<string | null>;
  /** 是否处于 Tauri 环境 */
  isTauri?: boolean;
}

export function useFormatActions({ cmViewRef, getActiveTab, promptUser, isTauri = false }: UseFormatActionsParams) {
  const handleFormatAction = useCallback((action: string) => {
    const view = cmViewRef.current;
    if (!view) return;

    const sel = view.state.selection.main;
    const docText = view.state.doc.toString();

    switch (action) {
      case 'bold': case 'italic': case 'strikethrough': case 'code': {
        const wrappers: Record<string, string> = {
          bold: '**', italic: '*', strikethrough: '~~', code: '`' };
        const wrapper = wrappers[action];
        const selectedText = docText.substring(sel.from, sel.to);
        const isMultiLine = selectedText.includes('\n');

        if (!isMultiLine) {
          // 单行：走原有逻辑
          const selInfo: SelectionInfo = { text: docText, start: sel.from, end: sel.to };
          const result: FormatResult = wrapSelection(selInfo, wrapper);
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: result.replacement },
            selection: { anchor: sel.from + result.newCursorOffset },
          });
        } else {
          // 多行：对每一行分别包装
          const lines = selectedText.split('\n');
          const wrappedLines = lines.map(line => {
            if (line.length === 0) return line; // 空行不包装
            // 检测 toggle：已被同符号包裹则去除
            if (line.startsWith(wrapper) && line.endsWith(wrapper) && line.length > wrapper.length * 2) {
              return line.slice(wrapper.length, line.length - wrapper.length);
            }
            return wrapper + line + wrapper;
          });
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: wrappedLines.join('\n') },
            selection: { anchor: sel.from + (wrappedLines[0].length > 0 ? wrapper.length : 0) },
          });
        }
        break;
      }
      case 'heading': case 'blockquote': case 'ul': case 'ol': {
        const prefixes: Record<string, string> = {
          heading: '# ', blockquote: '> ', ul: '- ', ol: '1. ' };
        const prefix = prefixes[action];

        // 检测是否多行选区
        const startLine = view.state.doc.lineAt(sel.from);
        const endLine = view.state.doc.lineAt(sel.to);
        const isMultiLineSelection = startLine.number !== endLine.number;

        if (!isMultiLineSelection || action === 'heading') {
          // 单行或标题：只处理光标所在行（标题不支持多行）
          const lineStart = startLine.from;
          const lineEnd = startLine.to;
          const result: FormatResult = toggleLinePrefix(docText, lineStart, prefix);
          view.dispatch({
            changes: { from: lineStart, to: lineEnd, insert: result.replacement },
            selection: { anchor: lineStart + result.newCursorOffset },
          });
        } else {
          // 多行：对选区内的每一行添加前缀（从后往前处理，避免位置偏移）
          const changes: { from: number; to: number; insert: string }[] = [];
          const cursorPos = sel.from; // 光标放到第一行开头

          for (let lineNum = endLine.number; lineNum >= startLine.number; lineNum--) {
            const line = view.state.doc.line(lineNum);
            const lineText = docText.substring(line.from, line.to);

            // 检查该行是否已有前缀，有则跳过（toggle 语义）
            const hasPrefix = action === 'ol'
              ? /^\d+\. /.test(lineText)
              : lineText.startsWith(prefix);

            if (hasPrefix) {
              // 已有前缀 → 移除
              const removeLen = action === 'ol'
                ? lineText.match(/^\d+\. /)?.[0].length ?? prefix.length
                : prefix.length;
              changes.push({ from: line.from, to: line.from + removeLen, insert: '' });
            } else {
              // 无前缀 → 添加（有序列表需要计算正确序号）
              const insertPrefix = action === 'ol'
                ? `${lineNum - startLine.number + 1}. `
                : prefix;
              changes.push({ from: line.from, to: line.from, insert: insertPrefix });
            }
          }

          view.dispatch({ changes, selection: { anchor: cursorPos } });
        }
        break;
      }
      case 'link': {
        (async () => {
          const url = await promptUser({
            title: '插入链接',
            description: '请输入目标网址，应用于已选中文字或指定链接文字',
            placeholder: 'https://example.com',
          });
          if (url === null) return;
          const selInfo: SelectionInfo = { text: docText, start: sel.from, end: sel.to };
          const result: FormatResult = insertLink(selInfo, url);
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: result.replacement },
            selection: { anchor: sel.from + result.newCursorOffset },
          });
          view.focus();
        })();
        break;
      }
      case 'image':
      case 'image-local': {
        (async () => {
          try {
            const filePath = await openDialog({
              filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
              multiple: false,
              directory: false,
            }) as string | null;
            if (!filePath) return;

            // 使用 invoke 读取字节，避免 asset:// 协议的 CSP 限制
            const bytes = await invoke<number[]>('read_file_bytes', { path: filePath });
            const data = new Uint8Array(bytes);
            const ext = filePath.split('.').pop()?.toLowerCase() || 'png';

            const docPath = getActiveTab().filePath;

            let mdSyntax: string;
            if (docPath) {
              // 已保存文档 → 写入 assets/images/ 并用相对路径
              const timestamp = Date.now();
              const fileName = `img-${timestamp}.${ext}`;
              const saveDir = `${docPath.replace(/[\/\\][^\/\\]+$/, '')}/assets/images`;
              const savePath = `${saveDir}/${fileName}`;
              await invoke('write_image_bytes', { path: savePath, data: Array.from(data) });
              mdSyntax = `![](assets/images/${fileName})`;
            } else {
              // 未保存文档 → 保存到设置目录或临时目录，插入绝对路径
              const fileName = generateImageFileName(ext);
              let saveDir = getImageSaveDir();
              let isTemp = false;

              if (!saveDir && isTauri) {
                try {
                  const { tempDir } = await import('@tauri-apps/api/path');
                  const tmp = (await tempDir()).replace(/[\\/]+$/, '');
                  saveDir = `${tmp}/marklite-images`;
                  isTemp = true;
                } catch {
                  // 获取临时目录失败 → 回退 base64
                }
              }

              if (saveDir) {
                // 标准化路径分隔符
                const normalizedDir = saveDir.replace(/\\/g, '/');
                const savePath = `${normalizedDir}/${fileName}`;
                await invoke('write_image_bytes', { path: savePath, data: Array.from(data) });
                const activeTab = getActiveTab();
                if (activeTab.id) {
                  addPendingImage(activeTab.id, { absolutePath: savePath, fileName, isTemp });
                }
                mdSyntax = `![](${savePath})`;
              } else {
                // 最终回退：base64
                const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
                const mime = MIME[ext] ?? 'image/png';
                let binary = '';
                const CHUNK = 32768;
                for (let i = 0; i < data.length; i += CHUNK) {
                  binary += String.fromCharCode(...data.subarray(i, i + CHUNK));
                }
                mdSyntax = `![](data:${mime};base64,${btoa(binary)})`;
              }
            }

            view.dispatch({
              changes: { from: sel.from, to: sel.to, insert: mdSyntax },
              selection: { anchor: sel.from + mdSyntax.length },
            });
          } catch {
            window.alert('本地图片选择需要 Tauri 环境，请使用「插入图片链接」功能。');
          }
        })();
        break;
      }
      case 'image-link': {
        (async () => {
          const src = await promptUser({
            title: '插入图片',
            description: '请输入图片 URL 地址，应用于已选中文字作为替代文字',
            placeholder: 'https://example.com/image.png',
          });
          if (src === null) return;
          if (src === '') {
            view.dispatch({ changes: { from: sel.from, to: sel.from, insert: '![]()' } });
            view.focus();
            return;
          }
          const selInfo: SelectionInfo = { text: docText, start: sel.from, end: sel.to };
          const result: FormatResult = insertImage(selInfo, src);
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: result.replacement },
            selection: { anchor: sel.from + result.newCursorOffset },
          });
          view.focus();
        })();
        break;
      }
      case 'codeblock': {
        const selected = docText.substring(sel.from, sel.to);
        if (selected.length > 0) {
          const wrapped = '```\n' + selected + '\n```';
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: wrapped },
            selection: { anchor: sel.from + 4 },
          });
        } else {
          const block = '```\n\n```';
          view.dispatch({
            changes: { from: sel.from, insert: block },
            selection: { anchor: sel.from + 4 },
          });
        }
        break;
      }
      case 'hr': {
        const line = view.state.doc.lineAt(sel.from);
        const insert = '\n---\n';
        view.dispatch({
          changes: { from: line.to, insert },
          selection: { anchor: line.to + insert.length },
        });
        break;
      }
      case 'task': {
        const prefix = '- [ ] ';
        const startLine = view.state.doc.lineAt(sel.from);
        const endLine = view.state.doc.lineAt(sel.to);
        const isMultiLineSelection = startLine.number !== endLine.number;

        if (!isMultiLineSelection) {
          const lineStart = startLine.from;
          const lineEnd = startLine.to;
          const lineText = docText.substring(lineStart, lineEnd);
          const hasTaskPrefix = /^- \[[ x]\] /.test(lineText);
          if (hasTaskPrefix) {
            const removeLen = lineText.match(/^- \[[ x]\] /)?.[0].length ?? prefix.length;
            view.dispatch({
              changes: { from: lineStart, to: lineStart + removeLen, insert: '' },
              selection: { anchor: lineStart },
            });
          } else {
            view.dispatch({
              changes: { from: lineStart, to: lineStart, insert: prefix },
              selection: { anchor: lineStart + prefix.length },
            });
          }
        } else {
          const changes: { from: number; to: number; insert: string }[] = [];
          for (let lineNum = endLine.number; lineNum >= startLine.number; lineNum--) {
            const line = view.state.doc.line(lineNum);
            const lineText = docText.substring(line.from, line.to);
            const hasTaskPrefix = /^- \[[ x]\] /.test(lineText);
            if (hasTaskPrefix) {
              const removeLen = lineText.match(/^- \[[ x]\] /)?.[0].length ?? prefix.length;
              changes.push({ from: line.from, to: line.from + removeLen, insert: '' });
            } else {
              changes.push({ from: line.from, to: line.from, insert: prefix });
            }
          }
          view.dispatch({ changes, selection: { anchor: sel.from } });
        }
        break;
      }
      case 'math': {
        const selected = docText.substring(sel.from, sel.to);
        if (selected.length > 0) {
          const wrapped = '$' + selected + '$';
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: wrapped },
            selection: { anchor: sel.from + 1 },
          });
        } else {
          const block = '$$\n\n$$';
          view.dispatch({
            changes: { from: sel.from, insert: block },
            selection: { anchor: sel.from + 3 },
          });
        }
        break;
      }
      default: {
        // Handle parameterized actions like "table:3x4"
        if (action.startsWith('table:')) {
          const match = action.match(/^table:(\d+)x(\d+)$/);
          if (!match) break;
          const rows = parseInt(match[1], 10);
          const cols = parseInt(match[2], 10);
          if (rows < 1 || cols < 1 || rows > 20 || cols > 20) break;

          const headerCells = Array.from({ length: cols }, (_, i) => ` Col ${i + 1} `);
          const headerLine = '|' + headerCells.join('|') + '|';
          const sepLine = '|' + Array(cols).fill(' --- ').join('|') + '|';
          const emptyRow = '|' + Array(cols).fill('  ').join('|') + '|';
          const bodyRows = Array(rows).fill(emptyRow).join('\n');
          const table = headerLine + '\n' + sepLine + '\n' + bodyRows + '\n';

          // Position cursor at first data cell (after "| " of first body row)
          const cursorOffset = headerLine.length + 1 + sepLine.length + 1 + 2;
          view.dispatch({
            changes: { from: sel.from, insert: table },
            selection: { anchor: sel.from + cursorOffset },
          });
        }
        break;
      }
    }
    view.focus();
  }, [getActiveTab]);

  return { handleFormatAction };
}
