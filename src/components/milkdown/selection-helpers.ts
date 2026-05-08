import YAML from 'js-yaml';
import type { Frontmatter } from '../../lib/markdown/extensions';

/**
 * Find the markdown character offset of DOM-selected text.
 * Returns -1 if the text cannot be located in the markdown.
 */
export function findTextInMarkdown(
  markdown: string,
  selectedText: string,
  sel: Selection,
  container: HTMLElement,
): number {
  const first = markdown.indexOf(selectedText);
  if (first === -1) return -1;
  if (markdown.indexOf(selectedText, first + 1) === -1) return first;
  return disambiguateByContext(markdown, selectedText, sel, container);
}

function disambiguateByContext(
  markdown: string,
  needle: string,
  sel: Selection,
  container: HTMLElement,
): number {
  if (sel.rangeCount === 0) return markdown.indexOf(needle);
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const textBefore = preRange.toString();

  const occurrences: number[] = [];
  let start = 0;
  while (true) {
    const i = markdown.indexOf(needle, start);
    if (i === -1) break;
    occurrences.push(i);
    start = i + 1;
  }

  let best = occurrences[0];
  let bestScore = -1;
  for (const occ of occurrences) {
    const mdBefore = markdown.slice(0, occ).replace(/[*_`#>[\]]/g, '');
    const score = commonSuffixLength(mdBefore, textBefore);
    if (score > bestScore) { bestScore = score; best = occ; }
  }
  return best;
}

/** Compute an approximate markdown offset for the cursor (no text selected). */
export function computeCursorOffset(
  markdown: string,
  sel: Selection,
  container: HTMLElement,
): number {
  if (sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const textBefore = preRange.toString();
  if (!textBefore) return 0;

  const context = textBefore.slice(-80);
  const mdStripped = markdown.replace(/[*_`#>[\]]/g, '');
  const ctxStripped = context.replace(/[*_`#>[\]]/g, '');
  const idx = mdStripped.lastIndexOf(ctxStripped);
  if (idx === -1) return Math.floor(markdown.length / 2);

  let origIdx = 0;
  let strippedCount = 0;
  while (origIdx < markdown.length && strippedCount < idx) {
    if (!/[*_`#>[\]]/.test(markdown[origIdx])) strippedCount++;
    origIdx++;
  }
  return Math.min(origIdx + context.length, markdown.length);
}

export function commonSuffixLength(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

/** Convert a Frontmatter object back to YAML string (without --- delimiters) */
export function frontmatterToYaml(fm: Frontmatter): string {
  return YAML.dump(fm).replace(/\n$/, '') + '\n';
}
