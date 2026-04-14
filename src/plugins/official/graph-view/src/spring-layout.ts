export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

/** Warn when node count exceeds this threshold (force-directed layout is O(n²)) */
export const NODE_COUNT_WARN_THRESHOLD = 100;

// ─── Spatial grid for O(n log n) repulsion (Barnes-Hut inspired) ────────────

// Module-level grid cache (mutated in layout loop)
let grid: Map<string, LayoutNode[]> | null = null;

/** Reusable Barnes-Hut style repulsion using a uniform grid.
 *  Each node only interacts with nodes in the 9 neighbouring cells.
 *  Complexity drops from O(n²) to O(n) for uniformly distributed nodes.
 */
function applyRepulsionGrid(
  nodes: LayoutNode[],
  REPULSION: number,
  cellSize: number,
): void {
  // Rebuild grid from current positions
  grid = new Map<string, LayoutNode[]>();
  for (const node of nodes) {
    const c = Math.floor(node.x / cellSize);
    const r = Math.floor(node.y / cellSize);
    const key = `${r},${c}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(node);
  }

  for (const a of nodes) {
    const cx = Math.floor(a.x / cellSize);
    const cy = Math.floor(a.y / cellSize);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const key = `${cy + dr},${cx + dc}`;
        const cell = grid.get(key);
        if (!cell) continue;
        for (const b of cell) {
          if (a === b) continue;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist > cellSize * 2.5) continue; // skip far nodes beyond interaction radius
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }
  }
}

// ─── Plain O(n²) repulsion for small graphs (no grid overhead) ────────────────

function applyRepulsionBrute(nodes: LayoutNode[], REPULSION: number): void {
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }
}

// ─── Shared core iteration step (used by both sync and async) ─────────────────

const REPULSION = 3000;
const ATTRACTION = 0.005;
const DAMPING = 0.85;
const CENTER_GRAVITY = 0.01;
/** Cell size for spatial grid. Should be tuned to REPULSION range. */
const GRID_CELL_SIZE = 150;

function runLayoutCore(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  iterations: number,
  nodeMap: Map<string, LayoutNode>,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const n = nodes.length;

  for (let iter = 0; iter < iterations; iter++) {
    for (const node of nodes) {
      node.vx = 0;
      node.vy = 0;
    }

    // Repulsion: grid-based for large graphs, brute-force for small ones
    if (n > 40) {
      applyRepulsionGrid(nodes, REPULSION, GRID_CELL_SIZE);
    } else {
      applyRepulsionBrute(nodes, REPULSION);
    }

    // Attraction along edges
    for (const edge of edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * ATTRACTION;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // Center gravity + apply velocity
    const pad = 30;
    for (const node of nodes) {
      node.vx += (cx - node.x) * CENTER_GRAVITY;
      node.vy += (cy - node.y) * CENTER_GRAVITY;
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(pad, Math.min(width - pad, node.x));
      node.y = Math.max(pad, Math.min(height - pad, node.y));
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Simple force-directed spring layout.
 * Runs synchronously for a fixed number of iterations.
 */
export function runSpringLayout(
  nodeIds: string[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  iterations = 150,
): Map<string, { x: number; y: number }> {
  const cx = width / 2;
  const cy = height / 2;
  const n = nodeIds.length;
  if (n === 0) return new Map();

  // Warn about performance for large graphs
  if (n > NODE_COUNT_WARN_THRESHOLD) {
    console.warn(
      `[graph-view] Large graph detected: ${n} nodes. ` +
        `Force-directed layout is O(n²) and may be slow. Consider filtering or simplifying the graph.`,
    );
  }

  // Initialize positions in a circle
  const nodes: LayoutNode[] = nodeIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = Math.min(width, height) * 0.3;
    return { id, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 };
  });

  const nodeMap = new Map(nodes.map((nd) => [nd.id, nd]));

  runLayoutCore(nodes, edges, width, height, iterations, nodeMap);

  return new Map(nodes.map((nd) => [nd.id, { x: nd.x, y: nd.y }]));
}

/**
 * Async, incremental force-directed layout using requestAnimationFrame batches.
 * Returns a cancel function. Calls onUpdate after each batch so the UI can
 * show intermediate positions without freezing the main thread.
 */
export function runSpringLayoutAsync(
  nodeIds: string[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  onUpdate: (positions: Map<string, { x: number; y: number }>) => void,
  options?: { iterations?: number; batchSize?: number },
): () => void {
  const iterations = options?.iterations ?? 150;
  const batchSize = options?.batchSize ?? 5;
  const n = nodeIds.length;

  if (n === 0) {
    onUpdate(new Map());
    return () => {};
  }

  if (n > NODE_COUNT_WARN_THRESHOLD) {
    console.warn(
      `[graph-view] Large graph detected: ${n} nodes. ` +
        `Force-directed layout is O(n²) and may be slow. Consider filtering or simplifying the graph.`,
    );
  }

  const cx = width / 2;
  const cy = height / 2;

  const nodes: LayoutNode[] = nodeIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = Math.min(width, height) * 0.3;
    return { id, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 };
  });

  const nodeMap = new Map(nodes.map((nd) => [nd.id, nd]));
  const pad = 30;

  let currentIter = 0;
  let rafId: number;
  let cancelled = false;

  const runBatch = () => {
    if (cancelled) return;

    const end = Math.min(currentIter + batchSize, iterations);

    for (let iter = currentIter; iter < end; iter++) {
      for (const node of nodes) {
        node.vx = 0;
        node.vy = 0;
      }
      if (n > 40) {
        applyRepulsionGrid(nodes, REPULSION, GRID_CELL_SIZE);
      } else {
        applyRepulsionBrute(nodes, REPULSION);
      }
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * ATTRACTION;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }
      for (const node of nodes) {
        node.vx += (cx - node.x) * CENTER_GRAVITY;
        node.vy += (cy - node.y) * CENTER_GRAVITY;
        node.vx *= DAMPING;
        node.vy *= DAMPING;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(pad, Math.min(width - pad, node.x));
        node.y = Math.max(pad, Math.min(height - pad, node.y));
      }
    }

    currentIter = end;
    onUpdate(new Map(nodes.map((nd) => [nd.id, { x: nd.x, y: nd.y }])));

    if (currentIter < iterations) {
      rafId = requestAnimationFrame(runBatch);
    }
  };

  rafId = requestAnimationFrame(runBatch);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}