/**
 * mermaid-bridge — Plugin registration interface for Mermaid rendering.
 *
 * Core code does NOT import mermaid directly. Instead, the marklite-mermaid
 * plugin calls registerMermaidRenderer() on activation, and the core checks
 * isMermaidAvailable() / getMermaidRenderer() before rendering.
 */

export interface MermaidRenderer {
  /** Initialize mermaid with the current theme. */
  init: () => Promise<void>;
  /** Render a diagram code string to SVG. */
  render: (id: string, code: string) => Promise<{ svg: string }>;
  /** Reset initialization state (e.g. theme changed). */
  reset: () => void;
}

let mermaidRenderer: MermaidRenderer | null = null;

export function registerMermaidRenderer(renderer: MermaidRenderer): void {
  mermaidRenderer = renderer;
}

export function unregisterMermaidRenderer(): void {
  mermaidRenderer = null;
}

export function getMermaidRenderer(): MermaidRenderer | null {
  return mermaidRenderer;
}

export function isMermaidAvailable(): boolean {
  return mermaidRenderer !== null;
}
