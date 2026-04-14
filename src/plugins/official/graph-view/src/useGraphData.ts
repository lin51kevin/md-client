import { useEffect, useState } from 'react';
import type { PluginContext } from '../../../plugin-sandbox';

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'orphan';
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Extract unique [[wiki-links]] from text content.
 */
function extractLinks(content: string): string[] {
  const links: string[] = [];
  const re = new RegExp(WIKILINK_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return [...new Set(links)];
}

/**
 * Build graph from workspace files.
 */
export function buildGraph(
  files: string[],
  readFile: (path: string) => Promise<string | null>,
  _setProgress?: (pct: number) => void,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  return (async () => {
    const linkMap = new Map<string, Set<string>>();
    const allMentioned = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const content = await readFile(filePath);
      if (content) {
        const links = extractLinks(content);
        if (links.length > 0) {
          linkMap.set(filePath, new Set(links));
          for (const link of links) {
            allMentioned.add(link);
          }
        }
      }
    }

    // Resolve links to actual file paths
    const fileBaseMap = new Map<string, string[]>();
    for (const fp of files) {
      const base = fp.replace(/\.(md|markdown|txt)$/i, '');
      const name = fp.split(/[/\\]/).pop()?.replace(/\.(md|markdown|txt)$/i, '') ?? fp;
      const existing = fileBaseMap.get(base) ?? [];
      existing.push(fp);
      fileBaseMap.set(base, existing);

      if (name !== base) {
        const existing2 = fileBaseMap.get(name) ?? [];
        existing2.push(fp);
        fileBaseMap.set(name, existing2);
      }
    }

    const resolve = (link: string): string | null => {
      const exact = fileBaseMap.get(link);
      if (exact && exact.length > 0) return exact[0];
      for (const [base, paths] of fileBaseMap) {
        if (base.toLowerCase() === link.toLowerCase()) return paths[0];
      }
      return null;
    };

    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];
    const degreeMap = new Map<string, number>();

    for (const [source, links] of linkMap) {
      for (const link of links) {
        const target = resolve(link);
        if (target && target !== source) {
          const key = [source, target].sort().join('|||');
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source, target });
          }
          degreeMap.set(source, (degreeMap.get(source) ?? 0) + 1);
          degreeMap.set(target, (degreeMap.get(target) ?? 0) + 1);
        }
      }
    }

    // Build nodes
    const nodeIds = new Set<string>();
    for (const e of edges) {
      nodeIds.add(e.source);
      nodeIds.add(e.target);
    }

    const nodes: GraphNode[] = [];
    for (const id of nodeIds) {
      nodes.push({
        id,
        label: id.split(/[/\\]/).pop() ?? id,
        type: 'file',
        degree: degreeMap.get(id) ?? 0,
      });
    }

    // Add orphan files (no links in or out) — only if total nodes < 200
    if (files.length <= 200) {
      for (const fp of files) {
        if (!nodeIds.has(fp) && !linkMap.has(fp)) {
          // Skip truly unlinked files in default view
        }
      }
    }

    return { nodes, edges };
  })();
}

/**
 * React hook that builds graph data from plugin context.
 */
export function useGraphData(ctx: PluginContext) {
  const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const files = ctx.workspace.getAllFiles();
      const result = await buildGraph(files, (path) => ctx.files.readFile(path));
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { ...data, loading, refresh };
}
