import { createElement, useState, useCallback } from 'react';
import type { PluginContext } from '../../../plugin-sandbox';

const WIKILINK_RE = /\[{2}([^\]]+)\]{2}/g;
const CONTEXT_LENGTH = 50;

interface BacklinkEntry {
  sourcePath: string;
  linkText: string;
  context: string;
}

export class BacklinksPanelContent {
  private context: PluginContext;
  private state: { backlinks: BacklinkEntry[]; loading: boolean };
  private listeners: Set<() => void> = new Set();

  constructor(context: PluginContext) {
    this.context = context;
    this.state = { backlinks: [], loading: false };
    this.refresh();
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private setState(partial: Partial<typeof this.state>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private extractWikilinks(content: string): string[] {
    const links: string[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(WIKILINK_RE.source, 'g');
    while ((match = re.exec(content)) !== null) {
      links.push(match[1].trim());
    }
    return links;
  }

  /** Extract context around each [[link]] occurrence */
  private extractContext(content: string, linkText: string): string {
    const re = new RegExp(`\\[{2}${linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]{2}`, 'g');
    const match = re.exec(content);
    if (!match) return '';
    const start = Math.max(0, match.index - CONTEXT_LENGTH);
    const end = Math.min(content.length, match.index + match[0].length + CONTEXT_LENGTH);
    let ctx = content.slice(start, end).replace(/\n/g, ' ');
    if (start > 0) ctx = '…' + ctx;
    if (end < content.length) ctx = ctx + '…';
    return ctx;
  }

  async refresh() {
    this.setState({ loading: true });
    try {
      const active = this.context.workspace.getActiveFile();
      const activePath = active.path;
      if (!activePath) {
        this.setState({ backlinks: [], loading: false });
        return;
      }

      const editorContent = this.context.editor.getContent();
      const myWikilinks = this.extractWikilinks(editorContent);
      if (myWikilinks.length === 0) {
        this.setState({ backlinks: [], loading: false });
        return;
      }

      const allFiles = this.context.workspace.getAllFiles();
      const myLinkSet = new Set(myWikilinks);
      const backlinks: BacklinkEntry[] = [];

      for (const filePath of allFiles) {
        if (filePath === activePath) continue;
        const content = await this.context.files.readFile(filePath);
        if (!content) continue;

        const links = this.extractWikilinks(content);
        for (const link of links) {
          if (myLinkSet.has(link)) {
            backlinks.push({
              sourcePath: filePath,
              linkText: link,
              context: this.extractContext(content, link),
            });
          }
        }
      }

      this.setState({ backlinks, loading: false });
    } catch {
      this.setState({ backlinks: [], loading: false });
    }
  }

  /** Called by sidebar to get a React component */
  render() {
    const self = this;
    function BacklinksPanel() {
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

      const { backlinks, loading } = self.state;

      return createElement('div', {
        style: {
          padding: '8px 12px',
          fontSize: '13px',
          color: 'var(--text-primary, inherit)',
          height: '100%',
          overflow: 'auto',
        },
      },
        createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          },
        },
          createElement('span', {
            style: { fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary, #888)' },
          }, `${backlinks.length} backlink${backlinks.length !== 1 ? 's' : ''}`),
          createElement('button', {
            onClick: () => self.refresh(),
            title: 'Refresh',
            style: {
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #888)',
              padding: '2px 4px',
              borderRadius: '4px',
            },
          }, '↻'),
        ),
        loading
          ? createElement('div', { style: { color: 'var(--text-tertiary, #aaa)', textAlign: 'center', padding: '20px 0' } }, 'Scanning…')
          : backlinks.length === 0
            ? createElement('div', { style: { color: 'var(--text-tertiary, #aaa)', textAlign: 'center', padding: '20px 0' } }, '当前文档没有反向链接')
            : createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              ...backlinks.map((bl, i) =>
                createElement('div', {
                  key: `${bl.sourcePath}-${i}`,
                  onClick: () => self.context.workspace.openFile(bl.sourcePath),
                  style: {
                    padding: '6px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary, transparent)',
                    border: '1px solid var(--border-color, #eee)',
                  },
                },
                  createElement('div', {
                    style: { fontWeight: 500, marginBottom: '2px', wordBreak: 'break-all' },
                  }, bl.sourcePath.split(/[/\\]/).pop() ?? bl.sourcePath),
                  createElement('div', {
                    style: { fontSize: '11px', color: 'var(--text-tertiary, #aaa)', wordBreak: 'break-all' },
                  }, bl.sourcePath),
                  bl.context
                    ? createElement('div', {
                        style: {
                          marginTop: '4px',
                          fontSize: '11px',
                          color: 'var(--text-secondary, #666)',
                          lineHeight: 1.4,
                        },
                      }, bl.context)
                    : null,
                ),
              ),
            ),
      );
    }

    return BacklinksPanel;
  }

  update() {
    this.refresh();
  }

  dispose() {
    this.listeners.clear();
  }
}
