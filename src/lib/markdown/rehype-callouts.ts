/**
 * rehype-callouts — Transform callout containerDirective output into proper HTML.
 *
 * remark-directive-rehype converts containerDirective nodes to <div> elements.
 * This plugin enhances them with proper structure (title bar, fold support).
 */

import type { Plugin } from 'unified';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';

export const rehypeCallouts: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const classes = node.properties?.className as string[] | undefined;
      if (!classes || !classes.includes('callout')) return;

      const calloutType = (node.properties?.['data-callout'] as string) || 'note';
      const title = (node.properties?.['data-callout-title'] as string) || capitalize(calloutType);
      const fold = (node.properties?.['data-callout-fold'] as string) || null;

      // Build title element
      const titleEl: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-title'] },
        children: [{ type: 'text', value: title }],
      };

      const contentEl: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-content'] },
        children: node.children,
      };

      if (fold) {
        // Collapsible: wrap in <details>/<summary>
        const summaryEl: Element = {
          type: 'element',
          tagName: 'summary',
          properties: {},
          children: [titleEl],
        };

        const detailsEl: Element = {
          type: 'element',
          tagName: 'details',
          properties: {
            className: ['callout', ...classes.filter((c: string) => c !== 'callout')],
            open: fold === 'open' ? true : undefined,
            'data-callout': calloutType,
          },
          children: [summaryEl, contentEl],
        };

        // Replace node properties with details
        node.tagName = detailsEl.tagName;
        node.properties = detailsEl.properties;
        node.children = detailsEl.children;
      } else {
        // Non-collapsible
        node.children = [titleEl, contentEl];
      }
    });
  };
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
