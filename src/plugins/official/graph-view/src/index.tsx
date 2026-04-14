import React from 'react';
import type { PluginContext } from '../../../plugin-sandbox';
import { GraphView } from './GraphView';
import { useGraphData } from './useGraphData';

export function activate(ctx: PluginContext) {
  const panel = ctx.sidebar.registerPanel('graph-view-official', {
    title: 'Graph',
    icon: 'share-2',
    render: () => React.createElement(GraphViewPlugin, { ctx }),
  });

  return {
    deactivate: () => panel.dispose(),
  };
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
