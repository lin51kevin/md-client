/**
 * DOM-based text highlighting utilities for the markdown preview pane.
 *
 * Two rendering paths:
 *
 *  1. CSS Custom Highlight API (preferred) — uses `CSS.highlights` + `Range`
 *     objects to mark text at the CSS rendering layer without touching the DOM.
 *     This is the only approach that works inside ProseMirror/Milkdown because
 *     ProseMirror owns its contenteditable DOM and will revert any injected
 *     `<mark>` elements on its next reconciliation pass.
 *
 *  2. DOM-injection fallback — wraps matching text nodes in
 *     `<mark class="preview-search-highlight">` elements.  Used when the CSS
 *     Highlight API is unavailable (older WebKit on Linux/macOS).
 *
 * Both paths are idempotent: call clearPreviewHighlight then
 * applyPreviewHighlight safely on every navigation click.
 */

const HIGHLIGHT_CLASS = 'preview-search-highlight';
const CSS_HIGHLIGHT_NAME = 'preview-search-highlight';

/** Selector for tags whose text content must not be touched. */
const SKIP_TAGS = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'MARK']);

function isCSSHighlightSupported(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof (globalThis as Record<string, unknown>)['Highlight'] === 'function'
  );
}

/**
 * Remove all highlights previously applied by applyPreviewHighlight,
 * using whichever path was available at the time.
 */
export function clearPreviewHighlight(container: HTMLElement): void {
  if (isCSSHighlightSupported()) {
    (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete(CSS_HIGHLIGHT_NAME);
    return;
  }
  // DOM injection fallback
  const marks = container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`);
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  }
  container.normalize();
}

/**
 * Build a RegExp from the search options, returning null for invalid patterns.
 */
export function buildSearchRegex(
  query: string,
  caseSensitive: boolean,
  regex: boolean,
  wholeWord: boolean,
): RegExp | null {
  if (!query) return null;
  try {
    const escaped = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  } catch {
    return null;
  }
}

/** Collect every text node under `container`, skipping code/pre blocks. */
function collectTextNodes(container: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        let el: Node | null = node.parentNode;
        while (el && el !== container) {
          if (el instanceof HTMLElement && SKIP_TAGS.has(el.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          el = el.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  return nodes;
}

/**
 * Highlight via CSS Custom Highlight API — no DOM modifications.
 * Works inside ProseMirror/Milkdown because highlights are applied at
 * CSS rendering time and are invisible to MutationObserver.
 * Returns the list of Range objects for each match (useful for scrolling).
 */
function applyHighlightCSS(container: HTMLElement, re: RegExp): Range[] {
  const ranges: Range[] = [];

  for (const textNode of collectTextNodes(container)) {
    const text = textNode.textContent ?? '';
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const range = document.createRange();
      range.setStart(textNode, m.index);
      range.setEnd(textNode, m.index + m[0].length);
      ranges.push(range);
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  if (ranges.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const HL = (globalThis as any).Highlight as new (...ranges: Range[]) => unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CSS as any).highlights.set(CSS_HIGHLIGHT_NAME, new HL(...ranges));
  }
  return ranges;
}

/**
 * Highlight via DOM injection — fallback for environments without the
 * CSS Custom Highlight API.  Inserts <mark> elements around matched text.
 * Returns Range objects wrapping each inserted mark for scroll positioning.
 */
function applyHighlightDOM(container: HTMLElement, re: RegExp): Range[] {
  // Collect first — modifying the DOM while walking it is unsafe.
  const textNodes = collectTextNodes(container);
  const markElements: HTMLElement[] = [];

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    re.lastIndex = 0;

    type Part = string | { match: string };
    const parts: Part[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push({ match: m[0] });
      last = re.lastIndex;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) parts.push(text.slice(last));
    if (!parts.some(p => typeof p === 'object')) continue;

    const parent = textNode.parentNode;
    if (!parent) continue;

    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (typeof part === 'string') {
        frag.appendChild(document.createTextNode(part));
      } else {
        const mark = document.createElement('mark');
        mark.className = HIGHLIGHT_CLASS;
        mark.textContent = part.match;
        frag.appendChild(mark);
        markElements.push(mark);
      }
    }
    parent.replaceChild(frag, textNode);
  }

  return markElements.map(el => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return r;
  });
}

/**
 * Walk all text nodes under `container` (skipping code/pre blocks) and
 * highlight every occurrence of `re`.  The regex MUST have the global (`g`) flag.
 * Returns Range objects for each match so callers can scroll to specific occurrences.
 */
export function applyPreviewHighlight(container: HTMLElement, re: RegExp): Range[] {
  if (isCSSHighlightSupported()) {
    return applyHighlightCSS(container, re);
  } else {
    return applyHighlightDOM(container, re);
  }
}
