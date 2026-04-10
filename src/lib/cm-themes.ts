/**
 * F011 — CodeMirror 自定义主题
 *
 * 为 sepia 和 high-contrast 提供专用的编辑器主题。
 * light / dark 继续使用 @uiw/react-codemirror 内置主题。
 */

import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// ─── Sepia 主题 ─────────────────────────────────────────────

const sepiaHighlight = HighlightStyle.define([
  { tag: tags.link, color: '#8b6914', textDecoration: 'underline' },
  { tag: tags.heading, color: '#4a3c28', fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700', color: '#5a4830' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.keyword, color: '#8b6914', fontWeight: '600' },
  { tag: tags.atom, color: '#a0522d' },
  { tag: tags.number, color: '#a0522d' },
  { tag: tags.string, color: '#6b8e23' },
  { tag: tags.escape, color: '#6b8e23' },
  { tag: tags.regexp, color: '#6b8e23' },
  { tag: tags.comment, color: '#9a8b75', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#3b3228' },
  { tag: tags.typeName, color: '#8b6914' },
  { tag: tags.function(tags.variableName), color: '#6b5010' },
  { tag: tags.definition(tags.variableName), color: '#5a4010', textDecoration: 'underline' },
  { tag: tags.separator, color: '#695d4e' },
  { tag: tags.bracket, color: '#695d4e' },
  { tag: tags.tagName, color: '#8b6914', fontWeight: '600' },
  { tag: tags.attributeName, color: '#a0522d' },
  { tag: tags.attributeValue, color: '#6b8e23' },
  { tag: tags.processingInstruction, color: '#8b6914', fontWeight: '600' },
]);

export const sepiaTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#f4ecd8',
      color: '#3b3228',
    },
    '.cm-gutters': {
      backgroundColor: '#efe5cd',
      color: '#9a8b75',
      borderRight: '1px solid #d4c9ab',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#e8dcc0',
      color: '#695d4e',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(212, 201, 171, 0.45)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(139, 105, 20, 0.15)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(139, 105, 20, 0.25)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(184, 134, 11, 0.3)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(184, 134, 11, 0.5)',
    },
    '.cm-cursor': {
      borderLeftColor: '#8b6914',
    },
    '.cm-content': {
      caretColor: '#8b6914',
    },
  },
  { dark: false },
);

export const sepiaCmTheme: Extension[] = [sepiaTheme, syntaxHighlighting(sepiaHighlight)];

// ─── High Contrast 主题 ──────────────────────────────────────

const hcHighlight = HighlightStyle.define([
  { tag: tags.link, color: '#0000cc', textDecoration: 'underline' },
  { tag: tags.heading, color: '#000000', fontWeight: '900' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '900', color: '#000000' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.keyword, color: '#0000cc', fontWeight: '700' },
  { tag: tags.atom, color: '#cc0000' },
  { tag: tags.number, color: '#cc0000' },
  { tag: tags.string, color: '#008000' },
  { tag: tags.escape, color: '#008000' },
  { tag: tags.regexp, color: '#008000' },
  { tag: tags.comment, color: '#555555', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#000000' },
  { tag: tags.typeName, color: '#0000cc' },
  { tag: tags.function(tags.variableName), color: '#cc0000' },
  { tag: tags.definition(tags.variableName), color: '#800080', textDecoration: 'underline' },
  { tag: tags.separator, color: '#222222' },
  { tag: tags.bracket, color: '#222222' },
  { tag: tags.tagName, color: '#0000cc', fontWeight: '700' },
  { tag: tags.attributeName, color: '#cc0000' },
  { tag: tags.attributeValue, color: '#008000' },
  { tag: tags.processingInstruction, color: '#0000cc', fontWeight: '700' },
]);

export const highContrastTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#000000',
    },
    '.cm-gutters': {
      backgroundColor: '#ffffff',
      color: '#444444',
      borderRight: '2px solid #000000',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#eeeeee',
      color: '#000000',
      fontWeight: '700',
    },
    '.cm-activeLine': {
      backgroundColor: '#eeeeee',
    },
    '.cm-selectionMatch': {
      backgroundColor: '#ccccff',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#9999ff',
    },
    '.cm-searchMatch': {
      backgroundColor: '#ffff00',
      color: '#000000',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#ffaa00',
    },
    '.cm-cursor': {
      borderLeftWidth: '2px',
      borderLeftColor: '#000000',
    },
    '.cm-content': {
      caretColor: '#000000',
    },
    '.cm-line': {
      padding: '0 4px',
    },
  },
  { dark: false },
);

export const highContrastCmTheme: Extension[] = [highContrastTheme, syntaxHighlighting(hcHighlight)];
