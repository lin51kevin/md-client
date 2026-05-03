/**
 * Shared Markdown rendering pipeline configuration.
 *
 * Centralizes the remark/rehype plugin arrays used across:
 *   - MarkdownPreview.tsx (ReactMarkdown preview pane)
 *   - html-export.ts (static HTML export)
 *   - Any plugin that renders markdown (e.g. ai-copilot ChatMessage)
 *
 * Arrays are defined at module level (not inside components) to prevent
 * ReactMarkdown from re-initializing the pipeline on every render.
 */

import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import remarkFootnotes from 'remark-footnotes';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { rehypeFilterInvalidElements } from './rehype-filter-invalid-elements';
import { remarkWikiLinks } from './remark-wikilinks';
import { rehypeWikiLinks } from './rehype-wikilinks';
import { getKatexPlugin } from './katex-bridge';

/**
 * Build core remark plugins. Dynamically includes remark-math if the
 * marklite-katex plugin has been activated.
 */
function buildCoreRemarkPlugins(): unknown[] {
  const plugins: unknown[] = [remarkGfm, remarkDirective, remarkDirectiveRehype];
  const katex = getKatexPlugin();
  if (katex) plugins.push(katex.remarkMath);
  return plugins;
}

/**
 * Build full remark plugins for the interactive preview pane.
 * Extends core plugins with footnotes, frontmatter, and wiki-links.
 */
export function buildPreviewRemarkPlugins(): unknown[] {
  const plugins = buildCoreRemarkPlugins();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins.push(remarkFootnotes as any, remarkFrontmatter, remarkWikiLinks);
  return plugins;
}

/**
 * Build rehype plugins for the interactive preview pane.
 * Dynamically includes rehype-katex if the marklite-katex plugin is active.
 */
export function buildPreviewRehypePlugins(): unknown[] {
  const plugins: unknown[] = [
    rehypeSlug,
    rehypeHighlight,
    rehypeRaw,
    rehypeWikiLinks,
    rehypeFilterInvalidElements,
  ];
  const katex = getKatexPlugin();
  if (katex) {
    // Insert katex after rehypeRaw (before wiki-links) for correct processing order
    plugins.splice(3, 0, katex.rehypeKatex);
  }
  return plugins;
}

/**
 * Core remark plugins (frozen snapshot). Consumers that need live katex
 * status should use buildPreviewRemarkPlugins() instead.
 * @deprecated Use buildPreviewRemarkPlugins() for live katex support.
 */
export const CORE_REMARK_PLUGINS = buildCoreRemarkPlugins();

/**
 * Full remark plugin set for preview. Prefer buildPreviewRemarkPlugins().
 * @deprecated Use buildPreviewRemarkPlugins() for live katex support.
 */
export const PREVIEW_REMARK_PLUGINS = (() => {
  const plugins = [...CORE_REMARK_PLUGINS];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins.push(remarkFootnotes as any, remarkFrontmatter, remarkWikiLinks);
  return plugins;
})();

/**
 * Full rehype plugin set for preview. Prefer buildPreviewRehypePlugins().
 * @deprecated Use buildPreviewRehypePlugins() for live katex support.
 */
export const PREVIEW_REHYPE_PLUGINS = (() => {
  const plugins: unknown[] = [rehypeSlug, rehypeHighlight, rehypeRaw, rehypeWikiLinks, rehypeFilterInvalidElements];
  const katex = getKatexPlugin();
  if (katex) plugins.splice(3, 0, katex.rehypeKatex);
  return plugins;
})();
