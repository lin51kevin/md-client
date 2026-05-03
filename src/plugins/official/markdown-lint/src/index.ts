/**
 * marklite-markdown-lint — Markdown 格式检查插件
 *
 * 检查规则：
 * 1. 标题风格一致（ATX 或 Setext，不能混用）
 * 2. 列表缩进统一（嵌套列表缩进 2 空格，不混用 tab）
 * 3. 标题/列表前后需要空行
 */

import type { Diagnostic } from '@codemirror/lint';
import type { PluginContext } from '../../../plugin-sandbox';

export async function activate(context: PluginContext) {
  const { linter } = await import('@codemirror/lint');

  const mdLint = linter((view) => {
    const diagnostics: Diagnostic[] = [];
    const doc = view.state.doc;
    const lineCount = doc.lines;
    let atxCount = 0;
    let setextCount = 0;

    // Collect lines
    const lines: string[] = [];
    for (let i = 1; i <= lineCount; i++) {
      lines.push(doc.line(i).text);
    }

    // Pass 1: detect heading style
    for (const line of lines) {
      if (/^#{1,6}\s/.test(line)) atxCount++;
      if (/^={3,}\s*$/.test(line) || /^-{3,}\s*$/.test(line)) setextCount++;
    }

    const predominantStyle = atxCount >= setextCount ? 'atx' : 'setext';
    const mixed = atxCount > 0 && setextCount > 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const pos = doc.line(i + 1).from;

      // Rule 1: heading style consistency
      if (/^#{1,6}\s/.test(line) && predominantStyle === 'setext' && mixed) {
        diagnostics.push({
          from: pos,
          to: pos + line.length,
          severity: 'warning',
          message: '文档主要使用 Setext 标题风格（===/---），建议保持一致',
          source: 'markdown-lint',
        });
      }
      // Setext underline check
      if (/^[=-]{3,}\s*$/.test(line) && predominantStyle === 'atx' && mixed) {
        diagnostics.push({
          from: pos,
          to: pos + line.length,
          severity: 'warning',
          message: '文档主要使用 ATX 标题风格（#），建议保持一致',
          source: 'markdown-lint',
        });
      }

      // ATX heading with closing #
      const atxMatch = line.match(/^(#{1,6}\s.+?)\s*#+\s*$/);
      if (atxMatch) {
        diagnostics.push({
          from: pos,
          to: pos + line.length,
          severity: 'info',
          message: '建议移除标题末尾多余的 # 符号',
          source: 'markdown-lint',
        });
      }

      // Rule 2: list indentation with tabs
      if (/^\t/.test(line)) {
        diagnostics.push({
          from: pos,
          to: pos + line.length,
          severity: 'warning',
          message: '列表缩进请使用空格而非 Tab',
          source: 'markdown-lint',
        });
      }

      // List item with non-2-space indent (after first level)
      if (/^  +[-*+]\s/.test(line)) {
        const indent = line.match(/^( +)/)![1].length;
        if (indent % 2 !== 0) {
          diagnostics.push({
            from: pos,
            to: pos + line.length,
            severity: 'warning',
            message: `列表缩进建议使用 2 的倍数（当前 ${indent} 空格）`,
            source: 'markdown-lint',
          });
        }
      }

      // Rule 3: blank line before headings
      if (/^#{1,6}\s/.test(line) && i > 0 && lines[i - 1].trim() !== '' && !/^[=-]{3,}\s*$/.test(lines[i - 1])) {
        diagnostics.push({
          from: pos,
          to: pos + line.length,
          severity: 'warning',
          message: '标题前应有空行',
          source: 'markdown-lint',
        });
      }

      // Blank line after heading
      if (/^#{1,6}\s/.test(line) && i < lines.length - 1 && lines[i + 1].trim() !== '') {
        diagnostics.push({
          from: pos,
          to: pos + line.length,
          severity: 'info',
          message: '标题后建议添加空行',
          source: 'markdown-lint',
        });
      }

      // Blank line before list (if preceded by non-list, non-empty, non-heading)
      if (/^[-*+]\s/.test(line) && i > 0) {
        const prev = lines[i - 1].trim();
        if (prev !== '' && !/^[-*+]\s/.test(lines[i - 1]) && !/^#{1,6}\s/.test(lines[i - 1])) {
          diagnostics.push({
            from: pos,
            to: pos + line.length,
            severity: 'info',
            message: '列表前建议添加空行',
            source: 'markdown-lint',
          });
        }
      }
    }

    return diagnostics;
  });

  const disposable = context.editor.registerExtension(mdLint);

  return {
    deactivate: () => disposable.dispose(),
  };
}
