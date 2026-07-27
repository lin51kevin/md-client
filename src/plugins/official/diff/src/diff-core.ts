import { diffLines, diffWordsWithSpace } from 'diff';

/** Options controlling how two texts are compared. */
export interface DiffOptions {
  /** Treat leading/trailing whitespace differences as equal. */
  ignoreWhitespace?: boolean;
  /** Compare case-insensitively. */
  ignoreCase?: boolean;
}

/** The kind of change a single aligned row represents. */
export type RowType = 'equal' | 'added' | 'removed' | 'modified';

/** A slice of a line used to render intra-line (word-level) highlighting. */
export interface InlineSegment {
  text: string;
  /** True when this segment differs from the other side. */
  changed: boolean;
}

/**
 * A single aligned row spanning both panes. `null` on a side means that side
 * has no corresponding line (a filler row used to keep both panes aligned).
 */
export interface DiffRow {
  type: RowType;
  leftLineNo: number | null;
  leftText: string | null;
  /** Word-level segments for `modified` rows; otherwise null. */
  leftSegments: InlineSegment[] | null;
  rightLineNo: number | null;
  rightText: string | null;
  rightSegments: InlineSegment[] | null;
  /** Index of the diff block this row belongs to; null for equal rows. */
  blockIndex: number | null;
}

/** Aggregate counts describing the comparison. */
export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
}

/** The full result of comparing two texts. */
export interface DiffResult {
  rows: DiffRow[];
  /** `rows` index where each diff block starts (for prev/next navigation). */
  blocks: number[];
  stats: DiffStats;
  /** True when input exceeded the safety limit and was not compared. */
  truncated: boolean;
}

/** Hard limit on total lines to avoid pathological memory/CPU usage. */
const MAX_TOTAL_LINES = 200_000;

/** Split a jsdiff chunk value into lines, dropping the trailing empty segment. */
function splitLines(value: string): string[] {
  const lines = value.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Compute word-level segments for a pair of changed lines. */
function inlineDiff(
  left: string,
  right: string,
  opts: DiffOptions,
): { left: InlineSegment[]; right: InlineSegment[] } {
  const parts = diffWordsWithSpace(left, right, { ignoreCase: opts.ignoreCase });
  const leftSeg: InlineSegment[] = [];
  const rightSeg: InlineSegment[] = [];
  for (const p of parts) {
    if (p.added) {
      rightSeg.push({ text: p.value, changed: true });
    } else if (p.removed) {
      leftSeg.push({ text: p.value, changed: true });
    } else {
      leftSeg.push({ text: p.value, changed: false });
      rightSeg.push({ text: p.value, changed: false });
    }
  }
  return { left: leftSeg, right: rightSeg };
}

interface LineGroup {
  type: 'equal' | 'added' | 'removed';
  lines: string[];
}

/**
 * Compare two texts and produce an aligned, block-annotated diff suitable for
 * side-by-side rendering. Pure and free of DOM dependencies so it can run in a
 * Web Worker or on the main thread.
 */
export function computeAlignedDiff(a: string, b: string, opts: DiffOptions = {}): DiffResult {
  const changes = diffLines(a, b, {
    ignoreWhitespace: opts.ignoreWhitespace,
    ignoreCase: opts.ignoreCase,
  });

  const groups: LineGroup[] = changes.map((c) => ({
    type: c.added ? 'added' : c.removed ? 'removed' : 'equal',
    lines: splitLines(c.value),
  }));

  const totalLines = groups.reduce((sum, g) => sum + g.lines.length, 0);
  if (totalLines > MAX_TOTAL_LINES) {
    return { rows: [], blocks: [], stats: { added: 0, removed: 0, modified: 0 }, truncated: true };
  }

  const rows: DiffRow[] = [];
  const stats: DiffStats = { added: 0, removed: 0, modified: 0 };
  let leftNo = 1;
  let rightNo = 1;

  const pushEqual = (text: string) => {
    rows.push({
      type: 'equal',
      leftLineNo: leftNo++, leftText: text, leftSegments: null,
      rightLineNo: rightNo++, rightText: text, rightSegments: null,
      blockIndex: null,
    });
  };
  const pushRemoved = (text: string) => {
    stats.removed++;
    rows.push({
      type: 'removed',
      leftLineNo: leftNo++, leftText: text, leftSegments: null,
      rightLineNo: null, rightText: null, rightSegments: null,
      blockIndex: null,
    });
  };
  const pushAdded = (text: string) => {
    stats.added++;
    rows.push({
      type: 'added',
      leftLineNo: null, leftText: null, leftSegments: null,
      rightLineNo: rightNo++, rightText: text, rightSegments: null,
      blockIndex: null,
    });
  };
  const pushModified = (left: string, right: string) => {
    stats.modified++;
    const seg = inlineDiff(left, right, opts);
    rows.push({
      type: 'modified',
      leftLineNo: leftNo++, leftText: left, leftSegments: seg.left,
      rightLineNo: rightNo++, rightText: right, rightSegments: seg.right,
      blockIndex: null,
    });
  };

  let i = 0;
  while (i < groups.length) {
    const g = groups[i];
    if (g.type === 'equal') {
      for (const line of g.lines) pushEqual(line);
      i += 1;
      continue;
    }
    // A removed group directly followed by an added group is a modified region.
    if (g.type === 'removed' && groups[i + 1]?.type === 'added') {
      const removedLines = g.lines;
      const addedLines = groups[i + 1].lines;
      const pairs = Math.min(removedLines.length, addedLines.length);
      for (let k = 0; k < pairs; k++) pushModified(removedLines[k], addedLines[k]);
      for (let k = pairs; k < removedLines.length; k++) pushRemoved(removedLines[k]);
      for (let k = pairs; k < addedLines.length; k++) pushAdded(addedLines[k]);
      i += 2;
      continue;
    }
    if (g.type === 'removed') {
      for (const line of g.lines) pushRemoved(line);
      i += 1;
      continue;
    }
    // added
    for (const line of g.lines) pushAdded(line);
    i += 1;
  }

  // Assign block indices: a block is a maximal run of non-equal rows.
  const blocks: number[] = [];
  let blockIndex = -1;
  let prevWasEqual = true;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.type === 'equal') {
      prevWasEqual = true;
      continue;
    }
    if (prevWasEqual) {
      blockIndex += 1;
      blocks.push(r);
    }
    row.blockIndex = blockIndex;
    prevWasEqual = false;
  }

  return { rows, blocks, stats, truncated: false };
}
