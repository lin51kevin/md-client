/**
 * WikiLink Milkdown native plugin.
 *
 * Replaces the DOM MutationObserver post-processing with a proper Milkdown
 * node schema + remark plugin integration.
 *
 * - Parses [[text]] via remark-wikilinks into wikiLink AST nodes
 * - Renders as <a class="wiki-link" data-wiki-target="text">text</a>
 * - Serializes back to [[text]] in markdown output
 */

import { $nodeSchema, $remark } from '@milkdown/utils';
import { remarkWikiLinks } from '../../../lib/remark-wikilinks';

/// Node schema ID
export const wikiLinkId = 'wikiLink';

/// The wiki-link node schema (inline, atom).
export const wikiLinkSchema = $nodeSchema(wikiLinkId, () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    target: { default: '' },
  },
  parseDOM: [
    {
      tag: 'a.wiki-link',
      getAttrs: (dom) => ({
        target: (dom as HTMLElement).getAttribute('data-wiki-target') || '',
      }),
    },
  ],
  toDOM: (node) => [
    'a',
    { class: 'wiki-link', 'data-wiki-target': node.attrs.target },
    node.attrs.target,
  ],
  parseMarkdown: {
    match: (node) => node.type === 'wikiLink',
    runner: (state, node, type) => {
      state.addNode(type, {
        target: (node as any).value ?? '',
      });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === wikiLinkId,
    runner: (state, node) => {
      (state as any).addText(`[[${node.attrs.target}]]`);
    },
  },
}));

/// Remark plugin that registers remark-wikilinks in the Milkdown remark pipeline.
export const remarkWikiLinkPlugin = $remark(
  'wikiLinkRemark',
  () => remarkWikiLinks
);

/// All plugins needed for wiki-link support — flatten and pass to editor.use().
export const wikiLinkPlugin = [
  remarkWikiLinkPlugin,
  wikiLinkSchema,
] as const;
