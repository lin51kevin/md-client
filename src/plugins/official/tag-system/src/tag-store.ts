import type { TagEntry } from './tag-extractor';

export interface TagIndex {
  /** tag → Set of file paths */
  map: Map<string, Set<string>>;
  /** all entries */
  entries: TagEntry[];
}

export function buildTagIndex(entries: TagEntry[]): TagIndex {
  const map = new Map<string, Set<string>>();
  for (const entry of entries) {
    let set = map.get(entry.tag);
    if (!set) {
      set = new Set();
      map.set(entry.tag, set);
    }
    set.add(entry.file);
  }
  return { map, entries };
}

export function getTagFiles(index: TagIndex, tag: string): string[] {
  return Array.from(index.map.get(tag) ?? []);
}

/** Group nested tags: e.g. "project/alpha" → parent "project" */
export function groupTags(index: TagIndex): Map<string, string[]> {
  const roots = new Map<string, string[]>();
  for (const tag of index.map.keys()) {
    const slash = tag.indexOf('/');
    const root = slash >= 0 ? tag.slice(0, slash) : tag;
    let children = roots.get(root);
    if (!children) {
      children = [];
      roots.set(root, children);
    }
    children.push(tag);
  }
  return roots;
}
