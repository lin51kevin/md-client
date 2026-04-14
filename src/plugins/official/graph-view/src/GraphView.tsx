import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GraphNode, GraphEdge } from './useGraphData';
import { runSpringLayout } from './spring-layout';
import type { PluginContext } from '../../../plugin-sandbox';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  ctx: PluginContext;
}

const MIN_RADIUS = 6;
const MAX_RADIUS = 24;
const TRUNCATE_LEN = 16;

function truncLabel(s: string): string {
  const base = s.replace(/\.(md|markdown|txt)$/i, '');
  if (base.length <= TRUNCATE_LEN) return base;
  return base.slice(0, TRUNCATE_LEN - 1) + '…';
}

function radiusForDegree(degree: number, maxDeg: number): number {
  if (maxDeg <= 0) return MIN_RADIUS;
  const t = degree / maxDeg;
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

export const GraphView: React.FC<Props> = ({ nodes, edges, ctx }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [layout, setLayout] = useState<Map<string, { x: number; y: number }> | null>(null);
  const draggingRef = useRef<{ nodeId: string | null; startX: number; startY: number; ox: number; oy: number }>({
    nodeId: null, startX: 0, startY: 0, ox: 0, oy: 0,
  });
  const panningRef = useRef<{ active: boolean; startX: number; startY: number; ox: number; oy: number }>({
    active: false, startX: 0, startY: 0, ox: 0, oy: 0,
  });

  // Compute layout
  useEffect(() => {
    if (nodes.length === 0) { setLayout(new Map()); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = Math.max(rect.width, 400);
    const h = Math.max(rect.height, 300);
    const positions = runSpringLayout(
      nodes.map((n) => n.id),
      edges.map((e) => ({ source: e.source, target: e.target })),
      w, h, 150,
    );
    setLayout(positions);
  }, [nodes, edges]);

  const maxDeg = Math.max(...nodes.map((n) => n.degree), 1);

  // Connected node IDs for highlight
  const connectedSet = hoveredId
    ? new Set([
        hoveredId,
        ...edges.filter((e) => e.source === hoveredId || e.target === hoveredId).flatMap((e) => [e.source, e.target]),
      ])
    : null;

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      const newK = Math.min(5, Math.max(0.2, prev.k * factor));
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, k: newK };
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      return { x: mx - (mx - prev.x) * (newK / prev.k), y: my - (my - prev.y) * (newK / prev.k), k: newK };
    });
  }, []);

  // Pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as Element).closest('.graph-node')) return;
    panningRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: transform.x, oy: transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panningRef.current.active) {
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      setTransform((prev) => ({ ...prev, x: panningRef.current.ox + dx, y: panningRef.current.oy + dy }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    panningRef.current.active = false;
    draggingRef.current.nodeId = null;
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    ctx.workspace.openFile(nodeId);
  }, [ctx]);

  // Empty state
  if (nodes.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🔗</div>
        <div style={styles.emptyTitle}>No links found</div>
        <div style={styles.emptyDesc}>
          Create [[wiki-links]] between your notes to build a knowledge graph.
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={styles.container}>
      <svg
        ref={svgRef}
        style={styles.svg}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredId(null); setTooltip(null); }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const s = layout?.get(edge.source);
            const t = layout?.get(edge.target);
            if (!s || !t) return null;
            const highlighted = !connectedSet || (connectedSet.has(edge.source) && connectedSet.has(edge.target));
            return (
              <line
                key={`e-${i}`}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={highlighted ? 'var(--accent-color, #6c5ce7)' : 'var(--border-color, #e0e0e0)'}
                strokeWidth={highlighted ? 1.5 : 0.8}
                opacity={connectedSet && !highlighted ? 0.2 : 0.6}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = layout?.get(node.id);
            if (!pos) return null;
            const r = radiusForDegree(node.degree, maxDeg);
            const isHovered = hoveredId === node.id;
            const dimmed = connectedSet && !connectedSet.has(node.id);
            const fill = node.type === 'orphan' ? 'var(--text-secondary, #999)' : 'var(--accent-color, #6c5ce7)';
            return (
              <g
                key={node.id}
                className="graph-node"
                transform={`translate(${pos.x},${pos.y})`}
                onMouseEnter={(e) => {
                  setHoveredId(node.id);
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left + 12,
                      y: e.clientY - rect.top - 10,
                      text: node.id,
                    });
                  }
                }}
                onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
                onClick={() => handleNodeClick(node.id)}
                style={{ cursor: 'pointer' }}
                opacity={dimmed ? 0.25 : 1}
              >
                <circle r={r} fill={fill} stroke={isHovered ? '#fff' : 'none'} strokeWidth={2} />
                <text
                  textAnchor="middle"
                  dy={r + 14}
                  fill={dimmed ? 'var(--text-secondary, #999)' : 'var(--text-primary, #333)'}
                  fontSize={10}
                  fontWeight={node.degree > 2 ? 600 : 400}
                >
                  {truncLabel(node.label)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Tooltip */}
        {tooltip && (
          <foreignObject x={tooltip.x} y={tooltip.y} width={300} height={30}>
            <div style={styles.tooltip}>{tooltip.text}</div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-primary, #fff)' },
  svg: { width: '100%', height: '100%', display: 'block' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary, #888)', padding: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyTitle: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 1.5, maxWidth: 240 },
  tooltip: { background: 'var(--bg-secondary, #1e1e2e)', color: 'var(--text-primary, #eee)', padding: '4px 8px', borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' },
};
