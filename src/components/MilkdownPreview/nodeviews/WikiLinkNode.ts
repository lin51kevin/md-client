/**
 * WikiLinkNode — Post-processing hook for MilkdownPreview.
 *
 * Scans the Milkdown DOM for [[text]] patterns that weren't parsed as wiki links,
 * and converts them to <a class="wiki-link" data-wiki-target="text"> elements.
 * Also handles clicks on wiki-link elements.
 */

import { useEffect, useCallback } from 'react';

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

export function useWikiLink(
  containerRef: React.RefObject<HTMLElement | null>,
  onNavigate?: (target: string) => void
) {
  const processWikiLinks = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Walk all text nodes looking for [[...]] that aren't already inside a wiki-link
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (WIKI_LINK_REGEX.test(node.textContent || '')) {
        // Skip if already inside a wiki-link
        const parent = node.parentElement;
        if (parent?.closest('.wiki-link')) continue;
        textNodes.push(node as Text);
      }
      WIKI_LINK_REGEX.lastIndex = 0;
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      WIKI_LINK_REGEX.lastIndex = 0;
      while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const target = match[1].trim().slice(0, 100);
        const a = document.createElement('a');
        a.className = 'wiki-link';
        a.setAttribute('data-wiki-target', target);
        a.href = '#';
        a.title = `跳转到: ${target}`;
        a.textContent = target;
        fragment.appendChild(a);
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }, [containerRef]);

  useEffect(() => {
    processWikiLinks();
  }, [processWikiLinks]);

  // MutationObserver for new wiki links
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      processWikiLinks();
    });

    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [containerRef, processWikiLinks]);

  // Click handler for wiki links
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.wiki-link');
      if (!target) return;
      e.preventDefault();
      const wikiTarget = target.getAttribute('data-wiki-target');
      if (wikiTarget && onNavigate) {
        onNavigate(wikiTarget);
      }
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [containerRef, onNavigate]);
}
