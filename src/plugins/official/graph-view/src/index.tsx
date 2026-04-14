import React from 'react';
import type { PluginContext } from '../../../plugin-sandbox';
import { GraphView } from './GraphView';
import { useGraphData } from './useGraphData';

export function activate(ctx: PluginContext) {
  ctx.sidebar.registerPanel('graph-view-official', {
    title: 'Graph',
    icon: '🔗',
    render: () => React.createElement(GraphViewPlugin, { ctx }),
  });
}

function GraphViewPlugin({ ctx }: { ctx: PluginContext }) {
  const { nodes, edges, loading } = useGraphData(ctx);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary, #888)' }}>
        Loading graph…
      </div>
    );
  }

  return React.createElement(GraphView, { nodes, edges, ctx });
}
