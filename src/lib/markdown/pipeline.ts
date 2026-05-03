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
import { remarkCallouts } from './remark-callouts';
import { rehypeCallouts } from './rehype-callouts';
import { getKatexPlugin } from './katex-bridge';

export type Pluggable = ReturnType<typeof remarkGfm> | ReturnType<typeof rehypeHighlight> | unknown;

/**
 * Build core remark plugins. Dynamically includes remark-math if the
 * marklite-katex plugin has been activated.
 */
export function buildCoreRemarkPlugins(): Pluggable[] {
  const plugins: Pluggable[] = [remarkGfm, remarkDirective, remarkCallouts, remarkDirectiveRehype];
  const katex = getKatexPlugin();
  if (katex) plugins.push(katex.remarkMath as Pluggable);
  return plugins;
}

/**
 * Build full remark plugins for the interactive preview pane.
 */
export function buildPreviewRemarkPlugins(): Pluggable[] {
  const plugins = buildCoreRemarkPlugins();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins.push(remarkFootnotes as any, remarkFrontmatter, remarkWikiLinks);
  return plugins;
}

/**
 * Build rehype plugins for the interactive preview pane.
 */
export function buildPreviewRehypePlugins(): Pluggable[] {
  const plugins: Pluggable[] = [
    rehypeSlug,
    rehypeHighlight,
    rehypeRaw,
    rehypeWikiLinks,
    rehypeFilterInvalidElements,
    rehypeCallouts,
  ];
  const katex = getKatexPlugin();
  if (katex) {
    plugins.splice(3, 0, katex.rehypeKatex as Pluggable);
  }
  return plugins;
}

/**
 * @deprecated Use buildCoreRemarkPlugins()
 */
export const CORE_REMARK_PLUGINS = buildCoreRemarkPlugins();

/**
 * @deprecated Use buildPreviewRemarkPlugins()
 */
export const PREVIEW_REMARK_PLUGINS = (() => {
  const plugins = buildPreviewRemarkPlugins();
  return plugins;
})();

/**
 * @deprecated Use buildPreviewRehypePlugins()
 */
export const PREVIEW_REHYPE_PLUGINS = buildPreviewRehypePlugins();
