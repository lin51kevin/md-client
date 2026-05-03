import { createElement, useState, useCallback } from 'react';
import type { PluginContext } from '../../../plugin-sandbox';
import { extractTags, type TagEntry } from './tag-extractor';
import { buildTagIndex, getTagFiles, groupTags } from './tag-store';

export class TagPanelContent {
  private context: PluginContext;
  private listeners = new Set<() => void>();
  private tags: TagEntry[] = [];
  private activeTag: string | null = null;

  constructor(context: PluginContext) {
    this.context = context;
    this.refresh();
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async refresh() {
    const allFiles = this.context.workspace.getAllFiles().filter((f: string) => f.endsWith('.md'));
    const entries: TagEntry[] = [];
    for (const filePath of allFiles) {
      const content = await this.context.files.readFile(filePath);
      if (!content) continue;
      entries.push(...extractTags(content, filePath));
    }
    this.tags = entries;
    this.notify();
  }

  private selectTag(tag: string | null) {
    this.activeTag = tag;
    this.notify();
  }

  private openFile(path: string) {
    this.context.workspace.openFile(path);
  }

  render() {
    const self = this;

    function TagPanel() {
      const [, forceUpdate] = useState(0);

      const subscribe = useCallback(
        (fn: () => void) => {
          self.listeners.add(fn);
          return () => { self.listeners.delete(fn); };
        },
        [],
      );

      // Re-subscribe on every render to keep state fresh
      subscribe(() => forceUpdate((n) => n + 1));

      const index = buildTagIndex(self.tags);
      const groups = groupTags(index);

      // Sort roots by total file count
      const sortedRoots = [...groups.entries()].sort((a, b) => {
        const countA = new Set(a[1].flatMap((t) => getTagFiles(index, t))).size;
        const countB = new Set(b[1].flatMap((t) => getTagFiles(index, t))).size;
        return countB - countA;
      });

      const activeFiles = self.activeTag
        ? getTagFiles(index, self.activeTag)
        : null;

      return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' } },
        // Header
        createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          createElement('span', { style: { fontWeight: 600, fontSize: '13px' } }, '🏷️ Tags'),
          createElement('button', {
            onClick: () => self.refresh(),
            style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #888)', padding: '2px 4px', borderRadius: '4px' },
          }, '↻'),
        ),

        // Clear filter
        self.activeTag
          ? createElement('div', {
              onClick: () => self.selectTag(null),
              style: { fontSize: '12px', color: 'var(--accent, #4a9eff)', cursor: 'pointer', padding: '4px 0', borderBottom: '1px solid var(--border-color, #eee)' },
            }, `← All tags (filtering: #${self.activeTag})`)
          : null,

        // Tag cloud
        createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
          ...sortedRoots.map(([root, children]) => {
            if (children.length === 1) {
              const tag = children[0];
              const count = (index.map.get(tag) ?? new Set()).size;
              return createElement('button', {
                key: tag,
                onClick: () => self.selectTag(tag === self.activeTag ? null : tag),
                style: {
                  background: tag === self.activeTag ? 'var(--accent, #4a9eff)' : 'var(--bg-secondary, #f0f0f0)',
                  color: tag === self.activeTag ? '#fff' : 'var(--text-primary, #333)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '2px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                },
              }, `#${tag}`, createElement('span', { style: { opacity: 0.7, marginLeft: '4px', fontSize: '10px' } }, `(${count})`));
            }
            // Nested group
            return createElement('div', { key: root, style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '60px' } },
              createElement('div', { style: { fontSize: '10px', color: 'var(--text-tertiary, #aaa)', fontWeight: 600 } }, `#${root}/`),
              createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px' } },
                ...children.map((tag) => {
                  const count = (index.map.get(tag) ?? new Set()).size;
                  const shortName = tag.slice(root.length + 1);
                  return createElement('button', {
                    key: tag,
                    onClick: () => self.selectTag(tag === self.activeTag ? null : tag),
                    style: {
                      background: tag === self.activeTag ? 'var(--accent, #4a9eff)' : 'var(--bg-secondary, #f0f0f0)',
                      color: tag === self.activeTag ? '#fff' : 'var(--text-primary, #333)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    },
                  }, shortName, createElement('span', { style: { opacity: 0.7, marginLeft: '3px', fontSize: '10px' } }, `(${count})`));
                }),
              ),
            );
          }),
        ),

        // File list when a tag is selected
        activeFiles
          ? createElement('div', {
              style: { marginTop: '8px', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '8px', flex: 1, overflowY: 'auto' },
            },
              createElement('div', { style: { fontSize: '12px', color: 'var(--text-secondary, #888)', marginBottom: '4px' } },
                `${activeFiles.length} document${activeFiles.length === 1 ? '' : 's'}`),
              ...activeFiles.map((filePath) =>
                createElement('div', {
                  key: filePath,
                  onClick: () => self.openFile(filePath),
                  style: {
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    background: 'var(--bg-secondary, transparent)',
                    border: '1px solid var(--border-color, #eee)',
                    marginBottom: '2px',
                    wordBreak: 'break-all',
                  },
                }, filePath.split(/[/\\]/).pop() ?? filePath),
              ),
            )
          : null,

        // Empty state
        self.tags.length === 0
          ? createElement('div', { style: { color: 'var(--text-tertiary, #aaa)', textAlign: 'center', padding: '20px 0', fontSize: '12px' } }, 'No tags found in workspace')
          : null,
      );
    }

    return TagPanel;
  }

  update() {
    this.refresh();
  }

  dispose() {
    this.listeners.clear();
  }
}
