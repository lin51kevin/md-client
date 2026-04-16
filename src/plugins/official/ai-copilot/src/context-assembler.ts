import type { EditorContext } from './providers/types';
import type { EditScopeMode } from './edit-scope';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

function getLineOffsets(content: string): number[] {
  const offsets = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

function getCursorWindow(content: string, cursorLine: number, windowSize = 20): string {
  const lines = content.split('\n');
  const lineIndex = Math.max(0, Math.min(lines.length - 1, cursorLine - 1));
  const from = Math.max(0, lineIndex - windowSize);
  const to = Math.min(lines.length, lineIndex + windowSize + 1);
  return lines.slice(from, to).join('\n');
}

function buildHeadingOutline(content: string): string {
  const lines = content.split('\n');
  const headings = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => /^#{1,6}\s+/.test(line))
    .slice(0, 40)
    .map(({ line, idx }) => {
      const level = (line.match(/^#{1,6}/)?.[0].length ?? 1) - 1;
      const heading = line.trim();
      return `${'  '.repeat(level)}- L${idx + 1}: ${heading}`;
    });

  return headings.length > 0 ? headings.join('\n') : '(no headings)';
}

export interface ScopedContextResult {
  targetText: string;
  outline: string;
  strategy: 'full' | 'smart-window' | 'selection' | 'cursor' | 'workspace' | 'section';
}

/**
 * Extract the heading section containing the cursor line.
 * Returns the slice from the nearest heading above the cursor to just before
 * the next heading of the same or higher level (or end of document).
 */
function getCursorSection(content: string, cursorLine: number): { text: string; startLine: number; endLine: number } {
  const lines = content.split('\n');
  const lineIndex = Math.max(0, Math.min(lines.length - 1, cursorLine - 1));

  // Find nearest heading at or above cursor
  let sectionStart = 0;
  let sectionLevel = 0;
  for (let i = lineIndex; i >= 0; i -= 1) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m) {
      sectionStart = i;
      sectionLevel = m[1].length;
      break;
    }
  }

  // Find end: next heading of equal or higher level (lower # count)
  let sectionEnd = lines.length;
  for (let i = sectionStart + 1; i < lines.length; i += 1) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= sectionLevel) {
      sectionEnd = i;
      break;
    }
  }

  return {
    text: lines.slice(sectionStart, sectionEnd).join('\n'),
    startLine: sectionStart + 1,
    endLine: sectionEnd,
  };
}

export function assembleScopedContext(
  context: EditorContext,
  scope: EditScopeMode,
  maxLength = 4000,
): ScopedContextResult {
  if (scope === 'selection' && context.selection) {
    return {
      targetText: context.selection.text,
      outline: buildHeadingOutline(context.content),
      strategy: 'selection',
    };
  }

  if (scope === 'section') {
    const section = getCursorSection(context.content, context.cursor.line);
    return {
      targetText: section.text,
      outline: buildHeadingOutline(context.content),
      strategy: 'section',
    };
  }

  if (scope === 'cursor') {
    const cursorWindow = getCursorWindow(context.content, context.cursor.line, 15);
    const outline = buildHeadingOutline(context.content);
    return {
      targetText: cursorWindow,
      outline,
      strategy: 'cursor',
    };
  }

  if (scope === 'workspace' && context.workspaceFiles && context.workspaceFiles.length > 0) {
    const merged = context.workspaceFiles
      .slice(0, 8)
      .map((f) => `### FILE: ${f.path}\n${f.content}`)
      .join('\n\n');
    return {
      targetText: truncate(merged, maxLength),
      outline: context.workspaceFiles.map((f) => f.path).slice(0, 20).join('\n'),
      strategy: 'workspace',
    };
  }

  const fullContent = context.content;
  const outline = buildHeadingOutline(fullContent);
  if (fullContent.length <= maxLength) {
    return {
      targetText: fullContent,
      outline,
      strategy: 'full',
    };
  }

  const cursorWindow = getCursorWindow(fullContent, context.cursor.line, 25);
  const assembled = `【Document Outline】\n${outline}\n\n【Cursor Window】\n${cursorWindow}`;
  return {
    targetText: truncate(assembled, maxLength),
    outline,
    strategy: 'smart-window',
  };
}

export function getSelectionLineRange(context: EditorContext): { start: number; end: number } | null {
  if (!context.selection) return null;
  const offsets = getLineOffsets(context.content);
  const start = offsets.findIndex((offset, i) => context.selection && offset <= context.selection.from && (i === offsets.length - 1 || offsets[i + 1] > context.selection.from));
  const end = offsets.findIndex((offset, i) => context.selection && offset <= context.selection.to && (i === offsets.length - 1 || offsets[i + 1] > context.selection.to));
  return {
    start: start + 1,
    end: Math.max(start, end) + 1,
  };
}
