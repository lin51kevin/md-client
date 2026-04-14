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

  // Initialize positions in a circle
  const nodes: LayoutNode[] = nodeIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = Math.min(width, height) * 0.3;
    return { id, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 };
  });

  const nodeMap = new Map(nodes.map((nd) => [nd.id, nd]));

  const REPULSION = 3000;
  const ATTRACTION = 0.005;
  const DAMPING = 0.85;
  const CENTER_GRAVITY = 0.01;

  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    for (const node of nodes) {
      node.vx = 0;
      node.vy = 0;
    }

    // Repulsion between all pairs
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
      // Keep in bounds
      node.x = Math.max(pad, Math.min(width - pad, node.x));
      node.y = Math.max(pad, Math.min(height - pad, node.y));
    }
  }

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

  const cx = width / 2;
  const cy = height / 2;

  const nodes: LayoutNode[] = nodeIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = Math.min(width, height) * 0.3;
    return { id, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 };
  });

  const nodeMap = new Map(nodes.map((nd) => [nd.id, nd]));

  const REPULSION = 3000;
  const ATTRACTION = 0.005;
  const DAMPING = 0.85;
  const CENTER_GRAVITY = 0.01;
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
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
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
