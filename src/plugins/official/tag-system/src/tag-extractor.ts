const TAG_RE = /(?:^|\s)#([a-zA-Z\u4e00-\u9fff][\w/\u4e00-\u9fff-]*)/g;

export interface TagEntry {
  tag: string;
  file: string;
  line: number;
}

export function extractTags(content: string, filePath: string): TagEntry[] {
  const entries: TagEntry[] = [];
  let line = 0;
  for (const lineText of content.split('\n')) {
    line++;
    for (const match of lineText.matchAll(TAG_RE)) {
      // 排除标题中的 # (## Title 等)
      const before = lineText.slice(0, match.index).trim();
      if (before === '' || before.endsWith('#') || before.endsWith('##') || before.endsWith('###')) continue;
      entries.push({ tag: match[1], file: filePath, line });
    }
  }
  return entries;
}
