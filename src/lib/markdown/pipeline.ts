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
import remarkMath from 'remark-math';
import remarkFootnotes from 'remark-footnotes';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import { rehypeFilterInvalidElements } from './rehype-filter-invalid-elements';
import { remarkWikiLinks } from './remark-wikilinks';
import { rehypeWikiLinks } from './rehype-wikilinks';

/**
 * Core remark plugins shared across all markdown rendering contexts.
 * These handle GFM, directives, and math — the common denominator.
 */
export const CORE_REMARK_PLUGINS = [
  remarkGfm,
  remarkDirective,
  remarkDirectiveRehype,
  remarkMath,
] as const;

/**
 * Full remark plugin set for the interactive preview pane (ReactMarkdown).
 * Extends CORE_REMARK_PLUGINS with footnotes, frontmatter, and wiki-links.
 */
export const PREVIEW_REMARK_PLUGINS = [
  ...CORE_REMARK_PLUGINS,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remarkFootnotes as any, // remark-footnotes bundles duplicate vfile types (known upstream issue)
  remarkFrontmatter,
  remarkWikiLinks,
] as const;

/**
 * Full rehype plugin set for the interactive preview pane (ReactMarkdown).
 */
export const PREVIEW_REHYPE_PLUGINS = [
  rehypeSlug,
  rehypeHighlight,
  rehypeRaw,
  rehypeKatex,
  rehypeWikiLinks,
  rehypeFilterInvalidElements,
] as const;
