/**
 * marklite-mermaid — Official Mermaid diagram rendering plugin.
 *
 * Dynamically imports mermaid (lazy, ~1.8 MB) and registers a MermaidRenderer
 * via the mermaid-bridge. Core code delegates to this renderer; if the plugin
 * is not active, diagrams degrade to plain code blocks.
 */

import type { PluginContext } from '../../../plugin-sandbox';
import {
  registerMermaidRenderer,
  unregisterMermaidRenderer,
  type MermaidRenderer,
} from '../../../../lib/markdown/mermaid-bridge';
import { getCurrentThemeConfig } from '../../../../lib/markdown/mermaid';

function detectTheme(): 'dark' | 'default' {
  if (typeof document === 'undefined') return 'default';
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
  if (!bg) return 'default';
  const el = document.createElement('div');
  el.style.color = bg;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const match = computed.match(/(\d+)/g);
  if (!match || match.length < 3) return 'default';
  const [r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45 ? 'dark' : 'default';
}

export async function activate(_context: PluginContext) {
  const mermaid = (await import('mermaid')).default;

  let initialized = false;
  let lastTheme = '';

  const renderer: MermaidRenderer = {
    init: async () => {
      const theme = detectTheme();
      if (initialized && theme === lastTheme) return;

      const config = getCurrentThemeConfig();
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        fontFamily: 'sans-serif',
        suppressErrorRendering: false,
        htmlLabels: false,
        flowchart: { htmlLabels: false, curve: 'basis' },
        sequence: { useMaxWidth: false },
        ...config,
      });
      initialized = true;
      lastTheme = theme;
    },

    render: async (id: string, code: string) => {
      // Ensure initialized before rendering
      await renderer.init();
      return mermaid.render(id, code);
    },

    reset: () => {
      initialized = false;
      lastTheme = '';
    },
  };

  // Initialize immediately so first render doesn't have to wait
  await renderer.init();
  registerMermaidRenderer(renderer);

  return {
    deactivate: () => unregisterMermaidRenderer(),
  };
}
