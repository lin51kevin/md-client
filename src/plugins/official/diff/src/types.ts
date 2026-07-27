/** Shared types for the Text Compare plugin UI. */

export type SourceKind = 'file' | 'text';

/** A comparison input: either a workspace file or inline/clipboard text. */
export interface DiffSource {
  kind: SourceKind;
  /** File path when kind === 'file'. */
  path?: string;
  /** Human-readable label shown in the toolbar. */
  name: string;
  /** Text content when kind === 'text'. */
  text?: string;
}

/** User-toggleable view options for the diff overlay. */
export interface DiffViewOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  onlyDiffs: boolean;
  syncScroll: boolean;
}

/** Color tokens; theme-aware CSS variables with translucent fallbacks that
 * work acceptably on both light and dark backgrounds. */
export const DIFF_COLORS = {
  addBg: 'var(--diff-add-bg, rgba(46,160,67,0.16))',
  delBg: 'var(--diff-del-bg, rgba(248,81,73,0.16))',
  modBg: 'var(--diff-mod-bg, rgba(210,153,34,0.16))',
  addInline: 'var(--diff-add-inline, rgba(46,160,67,0.42))',
  delInline: 'var(--diff-del-inline, rgba(248,81,73,0.42))',
  fillerBg: 'var(--diff-filler-bg, rgba(128,128,128,0.07))',
  addText: 'var(--diff-add-text, #2ea043)',
  delText: 'var(--diff-del-text, #f85149)',
  modText: 'var(--diff-mod-text, #d29922)',
} as const;
