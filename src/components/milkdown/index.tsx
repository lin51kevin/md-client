import { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import YAML from 'js-yaml';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { replaceAll } from '@milkdown/kit/utils';
import '@milkdown/crepe/theme/frame.css';
import '@milkdown/crepe/theme/common/style.css';
import 'katex/dist/katex.min.css';
import './theme.css';
import { extractFrontmatter, type Frontmatter } from '../../lib/markdown/extensions';
import { FrontmatterPanel } from './FrontmatterPanel';
import { useLocalImage, useHtmlBlocks, remarkWikiLinkPlugin, wikiLinkSchema } from './nodeviews';
import { renderMermaidPreview } from './nodeviews/MermaidBlockView';
import { CodeBlockFoldOverlay } from './CodeBlockFoldOverlay';
import { buildAIToolbar } from './ai-toolbar-bridge';
import { milkdownBridge } from '../../lib/milkdown/editor-bridge';

// ── Selection helpers ─────────────────────────────────────────────────────────

/**
 * Find the markdown character offset of DOM-selected text.
 * Returns -1 if the text cannot be located in the markdown.
 */
function findTextInMarkdown(
  markdown: string,
  selectedText: string,
  sel: Selection,
  container: HTMLElement,
): number {
  const first = markdown.indexOf(selectedText);
  if (first === -1) return -1;
  // Unique occurrence — done.
  if (markdown.indexOf(selectedText, first + 1) === -1) return first;
  // Multiple occurrences — use text-before-selection context to disambiguate.
  return disambiguateByContext(markdown, selectedText, sel, container);
}

function disambiguateByContext(
  markdown: string,
  needle: string,
  sel: Selection,
  container: HTMLElement,
): number {
  if (sel.rangeCount === 0) return markdown.indexOf(needle);
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const textBefore = preRange.toString();

  const occurrences: number[] = [];
  let start = 0;
  while (true) {
    const i = markdown.indexOf(needle, start);
    if (i === -1) break;
    occurrences.push(i);
    start = i + 1;
  }

  let best = occurrences[0];
  let bestScore = -1;
  for (const occ of occurrences) {
    // Strip common markdown punctuation before comparing context
    const mdBefore = markdown.slice(0, occ).replace(/[*_`#>[\]]/g, '');
    const score = commonSuffixLength(mdBefore, textBefore);
    if (score > bestScore) { bestScore = score; best = occ; }
  }
  return best;
}

/** Compute an approximate markdown offset for the cursor (no text selected). */
function computeCursorOffset(
  markdown: string,
  sel: Selection,
  container: HTMLElement,
): number {
  if (sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const textBefore = preRange.toString();
  if (!textBefore) return 0;

  // Use a trailing context window (last 80 rendered chars) to locate cursor.
  const context = textBefore.slice(-80);
  // Strip markdown punctuation for fuzzy match.
  const mdStripped = markdown.replace(/[*_`#>[\]]/g, '');
  const ctxStripped = context.replace(/[*_`#>[\]]/g, '');
  const idx = mdStripped.lastIndexOf(ctxStripped);
  if (idx === -1) return Math.floor(markdown.length / 2);

  // Map stripped index back to original markdown index.
  let origIdx = 0;
  let strippedCount = 0;
  while (origIdx < markdown.length && strippedCount < idx) {
    if (!/[*_`#>[\]]/.test(markdown[origIdx])) strippedCount++;
    origIdx++;
  }
  return Math.min(origIdx + context.length, markdown.length);
}

function commonSuffixLength(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

/** Convert a Frontmatter object back to YAML string (without --- delimiters) */
function frontmatterToYaml(fm: Frontmatter): string {
  return YAML.dump(fm).replace(/\n$/, '') + '\n';
}

interface MilkdownPreviewProps {
  content: string;
  onContentChange?: (newContent: string) => void;
  editable?: boolean;
  className?: string;
  filePath?: string;
  /** Called when user clicks a markdown link to open a file */
  onOpenFile?: (path: string) => void;
  /** Called when user clicks a [[wiki-link]] */
  onWikiLinkNavigate?: (target: string) => void;
}

function MilkdownEditor({
  content,
  onContentChange,
  editable = true,
  filePath,
  onOpenFile,
  onWikiLinkNavigate,
}: {
  content: string;
  onContentChange?: (newContent: string) => void;
  editable: boolean;
  filePath?: string;
  onOpenFile?: (path: string) => void;
  onWikiLinkNavigate?: (target: string) => void;
}) {
  // isExternalUpdate: guards replaceAll-triggered markdownUpdated events (tab switch etc.)
  const isExternalUpdate = useRef(false);
  const crepeRef = useRef<Crepe | null>(null);
  // hasUserInteractedRef: the core guard — onContentChange is NEVER called until the
  // user actually types or composes in the editor. This is the only reliable way to
  // prevent Milkdown's init normalization pass(es) from marking the file dirty.
  const hasUserInteractedRef = useRef(false);
  const lastContentRef = useRef('');
  const containerRef = useRef<HTMLDivElement>(null);

  // P1: Use refs for callbacks to avoid closure staleness in useEditor factory
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  // Track full content (with frontmatter) for bridge selection offset computation
  const contentRef = useRef(content);
  contentRef.current = content;

  // Extract frontmatter once per content change
  const { frontmatter, body } = useMemo(() => {
    const fm = extractFrontmatter(content);
    const b = content.replace(/^---[\s\S]*?---\n?/, '').replace(/^\n+/, '');
    return { frontmatter: fm, body: b };
  }, [content]);

  // Keep a ref so markdownUpdated callback can reconstruct full content
  const frontmatterRef = useRef(frontmatter);
  frontmatterRef.current = frontmatter;

  const { get } = useEditor((root) => {
    // Initialize lastContentRef to the initial body so the first sync check passes.
    lastContentRef.current = body;
    const crepe = new Crepe({
      root,
      defaultValue: body,
      featureConfigs: {
        [CrepeFeature.CodeMirror]: {
          renderPreview: renderMermaidPreview,
        },
        [CrepeFeature.Toolbar]: {
          buildToolbar: buildAIToolbar,
        },
      },
      features: {
        [CrepeFeature.CodeMirror]: true,
        [CrepeFeature.ListItem]: true,
        [CrepeFeature.LinkTooltip]: true,
        [CrepeFeature.Cursor]: true,
        [CrepeFeature.ImageBlock]: false,
        [CrepeFeature.BlockEdit]: false,
        [CrepeFeature.Toolbar]: true,
        [CrepeFeature.Placeholder]: false,
        [CrepeFeature.Table]: true,
        [CrepeFeature.Latex]: true,
        [CrepeFeature.TopBar]: false,
      },
    });

    crepeRef.current = crepe;

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, newMarkdown, prevMarkdown) => {
        if (isExternalUpdate.current) {
          // External sync (replaceAll on tab switch) — update baseline, never dirty.
          lastContentRef.current = newMarkdown;
          return;
        }
        if (!hasUserInteractedRef.current) {
          // Milkdown can fire markdownUpdated multiple times during initialization
          // (once per plugin/extension normalization pass). Until the user has
          // actually typed something, all of these are init noise — update the
          // baseline so the sync effect stays accurate, but never mark dirty.
          lastContentRef.current = newMarkdown;
          return;
        }
        if (newMarkdown === prevMarkdown) return;
        lastContentRef.current = newMarkdown;
        // Reconstruct full content with frontmatter
        const fm = frontmatterRef.current;
        const fullContent = Object.keys(fm).length > 0
          ? `---\n${frontmatterToYaml(fm)}---\n${newMarkdown}`
          : newMarkdown;
        onContentChangeRef.current?.(fullContent);
      });
    });

    // Register wiki-link plugins on the underlying editor before creation
    crepe.editor.use(remarkWikiLinkPlugin).use(wikiLinkSchema);

    if (!editable) {
      crepe.setReadonly(true);
    }

    return crepe;
  }, []);

  // Keep `get` in a ref so the sync effect below can call it without listing it
  // as a dependency (the `get` reference from useEditor may change on every render,
  // which would cause the effect to fire on each re-render and revert user edits).
  const getRef = useRef(get);
  getRef.current = get;

  // NodeView post-processing hooks
  useLocalImage(filePath, containerRef, content);
  useHtmlBlocks(containerRef, content);

  // Detect real user interaction — set flag so markdownUpdated knows to fire onContentChange.
  // Using capture phase so we intercept events before Milkdown's own handlers.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onInteract = () => { hasUserInteractedRef.current = true; };
    container.addEventListener('keydown', onInteract, true);
    container.addEventListener('compositionstart', onInteract, true);
    return () => {
      container.removeEventListener('keydown', onInteract, true);
      container.removeEventListener('compositionstart', onInteract, true);
    };
  }, []);

  // Link click delegation (wiki-links + markdown file links)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;

      // Wiki-link clicks
      const wikiLink = el.closest('.wiki-link');
      if (wikiLink) {
        e.preventDefault();
        const wikiTarget = wikiLink.getAttribute('data-wiki-target');
        if (wikiTarget) onWikiLinkNavigate?.(wikiTarget);
        return;
      }

      // Markdown file link clicks
      const anchor = el.closest('a[href]') as HTMLAnchorElement | null;
      if (anchor) {
        const href = anchor.getAttribute('href') ?? '';
        // Only handle relative/local file links (not http/https/mailto/hash)
        if (href && !/^https?:|^mailto:|^#/i.test(href)) {
          e.preventDefault();
          onOpenFile?.(href);
        }
      }
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [containerRef, onWikiLinkNavigate, onOpenFile]);

  // Sync external content changes → Milkdown.
  // Deps: only `body` (derived purely from `content`/`debouncedDoc`).
  // `get` is intentionally accessed via getRef.current so that an unstable
  // `get` reference does NOT re-trigger this effect on every render —
  // which was the root cause of edits immediately reverting.
  useEffect(() => {
    const crepe = crepeRef.current;
    const editor = getRef.current();
    if (!crepe || !editor) return;

    // lastContentRef tracks what Milkdown last emitted (via markdownUpdated) or
    // what we last SET into it (via replaceAll). Skip if content hasn't changed.
    // Trim comparison guards against trailing-newline normalization differences
    // between Milkdown's serializer and the raw CodeMirror buffer.
    if (body.trim() === lastContentRef.current.trim()) return;

    // External content change (tab switch / file reload) — reset interaction state
    // so the newly loaded content isn't immediately marked dirty.
    hasUserInteractedRef.current = false;
    isExternalUpdate.current = true;
    editor.action(replaceAll(body));
    lastContentRef.current = body;
    // Use microtask to reset flag — tighter than rAF, runs after sync dispatch
    // but before any subsequent user-initiated transactions
    queueMicrotask(() => {
      isExternalUpdate.current = false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  // Handle editable changes
  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    crepe.setReadonly(!editable);
  }, [editable]);

  // ── AI Copilot bridge: register setContent callback + focus tracking ─────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    milkdownBridge.setContent = (newContent: string) => {
      onContentChangeRef.current?.(newContent);
    };

    const onFocusIn = () => { milkdownBridge.hasFocus = true; };
    const onFocusOut = (e: FocusEvent) => {
      if (!container.contains(e.relatedTarget as Node | null)) {
        milkdownBridge.hasFocus = false;
      }
    };
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);

    return () => {
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      milkdownBridge.setContent = null;
      milkdownBridge.hasFocus = false;
      milkdownBridge.selection = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AI Copilot bridge: track DOM selection → markdown offsets ────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode) return;
      if (!container.contains(sel.anchorNode)) return;

      const selectedText = sel.toString();
      const fullContent = contentRef.current;

      if (selectedText) {
        const from = findTextInMarkdown(fullContent, selectedText, sel, container);
        milkdownBridge.selection = from >= 0
          ? { from, to: from + selectedText.length, text: selectedText }
          : null;
      } else {
        milkdownBridge.selection = null;
        if (sel.rangeCount > 0) {
          milkdownBridge.cursorOffset = computeCursorOffset(fullContent, sel, container);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <FrontmatterPanel frontmatter={frontmatter} />
      <div ref={containerRef}><Milkdown /></div>
    </>
  );
}

export const MilkdownPreview = memo(function MilkdownPreview({
  content,
  onContentChange,
  editable = true,
  className,
  filePath,
  onOpenFile,
  onWikiLinkNavigate,
}: MilkdownPreviewProps) {
  const handleContentChange = useCallback(
    (newContent: string) => {
      onContentChange?.(newContent);
    },
    [onContentChange]
  );

  const previewContainerRef = useRef<HTMLDivElement>(null);

  return (
    <MilkdownProvider>
      <div ref={previewContainerRef} className={`milkdown-preview${className ? ` ${className}` : ''}`}>
        <MilkdownEditor
          content={content}
          onContentChange={handleContentChange}
          editable={editable}
          filePath={filePath}
          onOpenFile={onOpenFile}
          onWikiLinkNavigate={onWikiLinkNavigate}
        />
        <CodeBlockFoldOverlay containerRef={previewContainerRef} />
      </div>
    </MilkdownProvider>
  );
});
