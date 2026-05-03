/**
 * F008 — Mermaid 图表渲染
 *
 * Detects ```mermaid code blocks in Markdown and renders them to SVG.
 * Uses the mermaid-bridge for actual rendering — the marklite-mermaid plugin
 * registers a MermaidRenderer; this module delegates to it.
 */

import { escapeHtml } from '../utils/html-safety';
import { toErrorMessage } from '../utils/errors';
import {
  isMermaidAvailable,
  getMermaidRenderer,
  type MermaidRenderer,
} from './mermaid-bridge';

let mermaidInitialized = false;
let currentMermaidTheme = '';
/** Module-level counter ensures globally unique DOM IDs across repeated renderMermaid calls */
let mermaidIdCounter = 0;

/**
 * Module-level SVG cache: code string → rendered SVG.
 * Prevents redundant mermaid.render() calls when the same diagram appears
 * in multiple preview re-renders (e.g. typing elsewhere in the document).
 * Keyed by the raw diagram source; entries are invalidated when the theme
 * changes (via reinitMermaid / resetMermaidInit).
 */
const svgCache = new Map<string, string>();

/**
 * Reset Mermaid initialization state (theme changes, tests, etc.)
 */
export function resetMermaidInit(): void {
  mermaidInitialized = false;
  currentMermaidTheme = '';
  svgCache.clear();
  // Also tell the plugin to reset if registered
  getMermaidRenderer()?.reset();
}

/**
 * Clear SVG cache only (tests)
 */
export function clearMermaidSvgCache(): void {
  svgCache.clear();
}

/**
 * Detect current theme from CSS custom properties.
 * Returns 'dark' if the document background is dark, 'default' otherwise.
 */
function detectTheme(): 'dark' | 'default' {
  if (typeof document === 'undefined') return 'default';
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
  if (!bg) return 'default';
  // Simple heuristic: if the background color is dark (luminance < 0.4), use dark theme
  const el = document.createElement('div');
  el.style.color = bg;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  // computed color is "rgb(r, g, b)" or "rgba(r, g, b, a)"
  const match = computed.match(/(\d+)/g);
  if (!match || match.length < 3) return 'default';
  const [r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45 ? 'dark' : 'default';
}

/**
 * Get theme-appropriate mermaid config (colors, CSS).
 */
function getThemeConfig(theme: 'dark' | 'default') {
  if (theme === 'dark') {
    return {
      theme: 'dark' as const,
      themeVariables: {
        // --- General ---
        primaryTextColor: '#e0e0e0',
        primaryColor: '#2d4a6f',
        primaryBorderColor: '#4a7ab5',
        lineColor: '#7ab0e0',
        secondaryColor: '#3d3d5c',
        tertiaryColor: '#2a2a3c',
        nodeTextColor: '#e0e0e0',
        edgeLabelBackground: '#1e1e2e',
        clusterBkg: '#2a2a3c',
        clusterBorder: '#4a5568',
        // --- Sequence diagram ---
        actorBkg: '#2d4a6f',
        actorBorder: '#4a7ab5',
        actorTextColor: '#e0e0e0',
        actorLineColor: '#7ab0e0',
        signalColor: '#7ab0e0',
        signalTextColor: '#e0e0e0',
        labelBoxBkgColor: '#2a2a3c',
        labelBoxBorderColor: '#4a5568',
        labelTextColor: '#e0e0e0',
        loopTextColor: '#e0e0e0',
        noteBkgColor: '#3d3d5c',
        noteBorderColor: '#4a5568',
        noteTextColor: '#e0e0e0',
        activationBkgColor: '#2d4a6f',
        activationBorderColor: '#4a7ab5',
        // --- Gantt ---
        taskTextColor: '#e0e0e0',
        taskTextLightColor: '#e0e0e0',
        taskTextDarkColor: '#e0e0e0',
        taskTextOutsideColor: '#e0e0e0',
        taskTextClickableColor: '#79c0ff',
        sectionBkgColor: '#21262d',
        altSectionBkgColor: '#161b22',
        gridColor: '#30363d',
        activeTaskBkgColor: '#2d4a6f',
        activeTaskBorderColor: '#4a7ab5',
        doneTaskBkgColor: '#1a2d1a',
        doneTaskBorderColor: '#3c6e3c',
        critBkgColor: '#4a1a1a',
        critBorderColor: '#8b2020',
        todayLineColor: '#f85149',
        // --- Pie chart ---
        pieTitleTextColor: '#e0e0e0',
        pieSectionTextColor: '#e0e0e0',
        pieLegendTextColor: '#e0e0e0',
        // --- Class diagram ---
        classText: '#e0e0e0',
        // --- State diagram ---
        labelColor: '#e0e0e0',
        // --- ER diagram ---
        attributeBackgroundColorEven: '#21262d',
        attributeBackgroundColorOdd: '#161b22',
      },
      themeCSS: `
        text, tspan { fill: #e0e0e0 !important; }
        .nodeLabel, .edgeLabel, .label { color: #e0e0e0 !important; }
        /* Sequence diagram */
        .actor text, .actor tspan { fill: #e0e0e0 !important; }
        .messageText { fill: #e0e0e0 !important; stroke: none !important; }
        .labelText, .labelText tspan { fill: #e0e0e0 !important; }
        .loopText, .loopText tspan { fill: #e0e0e0 !important; }
        .noteText, .noteText tspan { fill: #c0c0c0 !important; }
        /* Gantt */
        .taskText, .taskTextOutsideLeft, .taskTextOutsideRight { fill: #e0e0e0 !important; }
        .titleText { fill: #e0e0e0 !important; }
        .sectionTitle, .grid .tick text { fill: #b0b0b0 !important; }
        /* Pie chart */
        .pieTitleText { fill: #e0e0e0 !important; }
        .legend text, .pieLegend text { fill: #e0e0e0 !important; }
        text.slice { fill: #e0e0e0 !important; }
        /* Class diagram */
        .classText { fill: #e0e0e0 !important; }
        .classLabel .label { color: #e0e0e0 !important; }
        /* State diagram */
        .stateLabel text, .stateLabel tspan { fill: #e0e0e0 !important; }
        .statediagram-state .state-title text { fill: #e0e0e0 !important; }
        /* ER diagram */
        .er.entityLabel { fill: #e0e0e0 !important; }
        .er.relationshipLabel { fill: #c0c0c0 !important; }
        .er.attributeBoxEven text, .er.attributeBoxOdd text { fill: #e0e0e0 !important; }
        /* Git graph */
        .gitGraph .label text, .gitGraph .label tspan { fill: #e0e0e0 !important; }
        .branch-label text { fill: #e0e0e0 !important; }
        /* Mindmap */
        .mindmap-node .label, .mindmap-node text { fill: #e0e0e0 !important; }
        /* Timeline */
        .timeline-section text, .cScale0 text, .cScale1 text, .cScale2 text { fill: #e0e0e0 !important; }
        /* Connection lines */
        .flowchart-link, .edgePath path.path {
          stroke-width: 2px !important;
          stroke: #7ab0e0 !important;
        }
        .marker {
          fill: #7ab0e0 !important;
          stroke: #7ab0e0 !important;
        }
        /* Cluster borders */
        .cluster rect {
          stroke: #4a7ab5 !important;
        }
      `,
    };
  }
  return {
    theme: 'default' as const,
    themeVariables: {
      primaryTextColor: '#1f1f1f',
      nodeTextColor: '#1f1f1f',
      lineColor: '#555',
      primaryColor: '#e8f4fd',
      primaryBorderColor: '#1f77b4',
      secondaryColor: '#f0f0f0',
      tertiaryColor: '#fafafa',
      clusterBkg: '#f0f4f8',
      clusterBorder: '#1f77b4',
    },
    themeCSS: `
      text, tspan { fill: #1f1f1f !important; }
      .nodeLabel, .edgeLabel, .label { color: #1f1f1f !important; }
      /* Enhance connection line visibility in light mode */
      .flowchart-link, .edgePath path.path {
        stroke-width: 1.8px !important;
        stroke: #555 !important;
      }
      .marker {
        fill: #555 !important;
        stroke: #555 !important;
      }
      /* Cluster borders */
      .cluster rect {
        stroke: #1f77b4 !important;
      }
    `,
  };
}

/**
 * Get the theme config for the current detected theme.
 * Exported so the plugin can use it during initialization.
 */
export function getCurrentThemeConfig() {
  return getThemeConfig(detectTheme());
}

/**
 * Initialize Mermaid via the bridge.
 * If no renderer is registered, this is a no-op (graceful degradation).
 */
export async function initMermaid(): Promise<void> {
  if (!isMermaidAvailable()) return;

  const renderer = getMermaidRenderer()!;
  const detectedTheme = detectTheme();

  // Re-initialize if theme changed
  if (!mermaidInitialized || detectedTheme !== currentMermaidTheme) {
    await renderer.init();
    mermaidInitialized = true;
    currentMermaidTheme = detectedTheme;
  }
}

/**
 * Re-initialize mermaid with the current theme (call when theme changes).
 */
export function reinitMermaid(): void {
  mermaidInitialized = false;
  currentMermaidTheme = '';
  svgCache.clear();
  getMermaidRenderer()?.reset();
}

/**
 * Render Mermaid diagrams in text to SVG.
 *
 * @param text - Markdown text containing ```mermaid code blocks
 * @returns Text with mermaid blocks replaced by SVG (or original code if plugin unavailable)
 */
export async function renderMermaid(text: string): Promise<string> {
  if (!text || !text.includes('mermaid')) return text;
  if (!isMermaidAvailable()) return text; // Graceful degradation: leave code blocks as-is

  await initMermaid();
  const renderer = getMermaidRenderer()!;

  // Match ```mermaid ... ``` code blocks (non-greedy, multi-line, LF/CRLF)
  const mermaidRe = /```mermaid\r?\n([\s\S]*?)```/g;

  let idCounter = mermaidIdCounter;
  const results = await Promise.all(
    [...text.matchAll(mermaidRe)].map(async (match) => {
      const code = match[1].trim();

      // Cache hit
      const cached = svgCache.get(code);
      if (cached !== undefined) {
        return { fullMatch: match[0], replacement: cached };
      }

      const id = `mermaid-${idCounter++}`;
      mermaidIdCounter = idCounter;
      try {
        const { svg } = await renderer.render(id, code);
        svgCache.set(code, svg);
        return { fullMatch: match[0], replacement: svg };
      } catch (err) {
        const errHtml = `<div class="mermaid-error" style="color:red;padding:8px;border:1px solid red;">Mermaid render error: ${escapeHtml(toErrorMessage(err))}</div>`;
        return { fullMatch: match[0], replacement: errHtml };
      }
    })
  );

  let result = text;
  for (const r of results) {
    result = result.replace(r.fullMatch, r.replacement);
  }

  return result;
}
