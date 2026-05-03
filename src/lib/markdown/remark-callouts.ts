/**
 * remark-callouts — Parse Obsidian-style `> [!type] Title` callout syntax.
 *
 * Transforms blockquote nodes that start with `[!type]` into containerDirective
 * nodes compatible with remark-directive-rehype.
 *
 * Supports:
 *   > [!type] Title   — titled callout
 *   > [!type]- Title  — collapsible (closed)
 *   > [!type]+ Title  — collapsible (open)
 */

import type { Plugin } from 'unified';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';
import { visit } from 'unist-util-visit';

interface ContainerDirective {
  type: 'containerDirective';
  name: string;
  children: any[];
  attributes: Record<string, string>;
  data?: Record<string, any>;
}

const CALLOUT_TYPES = new Set([
  'note', 'info', 'tip', 'hint', 'warning', 'danger', 'caution',
  'abstract', 'summary', 'todo', 'check', 'question', 'help',
  'failure', 'fail', 'missing', 'bug', 'example', 'quote', 'cite',
]);

const CALLOUT_RE = /^\[!(\w+)([+-])?\]\s*(.*)/;

export const remarkCallouts: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const indices: number[] = [];
    const replacementMap: Record<number, ContainerDirective> = {};

    visit(tree, 'blockquote', (node: Blockquote, index) => {
      if (index == null) return;
      const first = node.children[0] as Paragraph | undefined;
      if (!first || first.type !== 'paragraph') return;
      const firstText = first.children[0] as Text | undefined;
      if (!firstText || firstText.type !== 'text') return;

      const match = CALLOUT_RE.exec(firstText.value);
      if (!match) return;

      const [, type, fold, title] = match;
      const calloutType = type.toLowerCase();
      if (!CALLOUT_TYPES.has(calloutType)) return;

      // Build containerDirective node
      const contentChildren: typeof node.children = [];

      // If there's remaining text in the first paragraph after the callout header
      // (e.g. no title, but same line text), keep it
      // If title exists, it goes into data
      // Remaining children of first paragraph go as content
      if (first.children.length > 1) {
        // There are inline nodes after the first text node
        const remaining: typeof first.children = [];
        // If no title, the rest of firstText after the match is content
        if (!title && fold) {
          // No title, fold marker present — rest of firstText is content
        }
        // Keep remaining children from the paragraph as content
        const restText = firstText.value.slice(match[0].length).trim();
        if (restText) {
          remaining.push({ type: 'text', value: restText } as Text);
        }
        remaining.push(...first.children.slice(1));
        if (remaining.length > 0) {
          contentChildren.push({ type: 'paragraph', children: remaining } as Paragraph);
        }
      } else {
        // Only one text node — check if there's text after the header
        const restText = firstText.value.slice(match[0].length).trim();
        if (restText) {
          contentChildren.push({
            type: 'paragraph',
            children: [{ type: 'text', value: restText } as Text],
          } as Paragraph);
        }
      }

      // Add remaining blockquote children as callout content
      contentChildren.push(...node.children.slice(1));

      const directive: ContainerDirective = {
        type: 'containerDirective',
        name: calloutType,
        children: contentChildren,
        attributes: {},
        data: {
          hName: 'div',
          hProperties: {
            className: [`callout`, `callout-${calloutType}`],
            'data-callout': calloutType,
            ...(title ? { 'data-callout-title': title } : {}),
            ...(fold === '-' ? { 'data-callout-fold': 'closed' } : {}),
            ...(fold === '+' ? { 'data-callout-fold': 'open' } : {}),
          },
        },
      } as ContainerDirective;

      indices.push(index);
      replacementMap[index] = directive;
    });

    // Replace blockquotes in reverse order
    if (Object.keys(replacementMap).length > 0) {
      const sortedIndices = Object.keys(replacementMap).map(Number).sort((a, b) => b - a);
      for (const idx of sortedIndices) {
        tree.children.splice(idx, 1, replacementMap[idx]);
      }
    }
  };
};
