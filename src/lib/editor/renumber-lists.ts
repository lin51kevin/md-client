/**
 * Renumber all ordered list blocks in a markdown string.
 * Each contiguous block of `\s*\d+. ` lines at the same indent level
 * is renumbered from 1 sequentially.  A blank line resets all counters;
 * a non-blank, non-list line resets counters for deeper indent levels.
 */
export function renumberOrderedListsInMarkdown(text: string): string {
  const lines = text.split('\n');
  // Stack tracks the expected next number per indent depth.
  const counters: Record<number, number> = {};

  return lines.map((line) => {
    const m = line.match(/^(\s*)(\d+)\. (.*)$/);
    if (!m) {
      const trimmed = line.trimStart();
      if (trimmed === '') {
        // blank line resets all counters
        Object.keys(counters).forEach((k) => { delete counters[Number(k)]; });
      }
      // non-blank non-list line only resets deeper indents (handled when next list line seen)
      return line;
    }
    const indent = m[1].length;
    // Reset counters for any indent level deeper than current (sub-list ended)
    Object.keys(counters)
      .map(Number)
      .filter((k) => k > indent)
      .forEach((k) => { delete counters[k]; });
    counters[indent] = (counters[indent] ?? 0) + 1;
    return `${m[1]}${counters[indent]}. ${m[3]}`;
  }).join('\n');
}
