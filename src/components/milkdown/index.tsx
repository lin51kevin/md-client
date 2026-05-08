import { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/core';
import { TextSelection } from 'prosemirror-state';
import '@milkdown/crepe/theme/frame.css';
import '@milkdown/crepe/theme/common/style.css';
import '../css/embed-containers.css';
import './theme.css';
import { extractFrontmatter } from '../../lib/markdown/extensions';
import { FrontmatterPanel } from './FrontmatterPanel';
import { useLocalImage, useHtmlBlocks, remarkWikiLinkPlugin, wikiLinkSchema } from './nodeviews';
import { renderMermaidPreview } from './nodeviews/MermaidBlockView';
import { CodeBlockFoldOverlay } from './CodeBlockFoldOverlay';
import { frontmatterToYaml } from './selection-helpers';
import { useMilkdownBridge, setupBridgeCommands } from './useMilkdownBridge';
import { useMilkdownEvents } from './useMilkdownEvents';

interface MilkdownPreviewProps {
  content: string;
  onContentChange?: (newContent: string) => void;
  editable?: boolean;
  className?: string;
  filePath?: string;
  onOpenFile?: (path: string) => void;
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
  const isExternalUpdate = useRef(false);
  const crepeRef = useRef<Crepe | null>(null);
  const hasUserInteractedRef = useRef(false);
  const lastContentRef = useRef('');
  const containerRef = useRef<HTMLDivElement>(null);
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;
  const contentRef = useRef(content);
  contentRef.current = content;

  // Reset interaction guard on tab switch
  const prevFilePathRef = useRef(filePath);
  if (prevFilePathRef.current !== filePath) {
    prevFilePathRef.current = filePath;
    hasUserInteractedRef.current = false;
  }

  // Extract frontmatter
  const { frontmatter, body } = useMemo(() => {
    const fm = extractFrontmatter(content);
    const b = content.replace(/^---[\s\S]*?---\n?/, '').replace(/^\n+/, '');
    return { frontmatter: fm, body: b };
  }, [content]);

  const frontmatterRef = useRef(frontmatter);
  frontmatterRef.current = frontmatter;

  // Table cell selection fix (Bug 3)
  const tableCellFixRef = useRef<{ anchorPos: number } | null>(null);

  const { get } = useEditor((root) => {
    lastContentRef.current = body;
    const crepe = new Crepe({
      root,
      defaultValue: body,
      featureConfigs: {
        [CrepeFeature.CodeMirror]: { renderPreview: renderMermaidPreview },
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

    // Table cell selection fix
    crepe.on((listener) => {
      listener.mounted(() => {
        try {
          const view = crepe.editor.ctx.get(editorViewCtx);
          const dom = view.dom as HTMLElement;
          const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;
            if (target.closest('button') || target.closest('.cell-handle') ||
                target.closest('.line-handle') || target.closest('.drag-preview') ||
                target.closest('[contenteditable="false"]')) return;
            const cell = target.closest('td, th');
            if (!cell) return;
            const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
            if (!pos || pos.inside < 0) return;
            const $pos = view.state.doc.resolve(pos.inside);
            tableCellFixRef.current = { anchorPos: $pos.pos };
          };
          const handleMouseUp = () => {
            const fix = tableCellFixRef.current;
            if (!fix) return;
            tableCellFixRef.current = null;
            const { state } = view;
            if (state.selection.constructor.name === 'NodeSelection') {
              const $pos = state.doc.resolve(fix.anchorPos);
              const textSel = TextSelection.create(state.doc, $pos.pos, $pos.pos);
              view.dispatch(state.tr.setSelection(textSel).scrollIntoView());
            }
          };
          dom.addEventListener('mousedown', handleMouseDown, true);
          dom.addEventListener('mouseup', handleMouseUp, true);
          (crepe as any)._tableCellFixCleanup = () => {
            dom.removeEventListener('mousedown', handleMouseDown, true);
            dom.removeEventListener('mouseup', handleMouseUp, true);
          };
        } catch { /* editor not ready */ }
      });
    });

    // markdownUpdated handler
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, newMarkdown, prevMarkdown) => {
        if (isExternalUpdate.current) {
          lastContentRef.current = newMarkdown;
          return;
        }
        if (!hasUserInteractedRef.current) {
          lastContentRef.current = newMarkdown;
          return;
        }
        if (newMarkdown === prevMarkdown) return;
        lastContentRef.current = newMarkdown;
        const fm = frontmatterRef.current;
        const fullContent = Object.keys(fm).length > 0
          ? `---\n${frontmatterToYaml(fm)}---\n${newMarkdown}`
          : newMarkdown;
        onContentChangeRef.current?.(fullContent);
      });
    });

    crepe.editor.use(remarkWikiLinkPlugin).use(wikiLinkSchema);

    // Bridge commands (undo/redo/runCommand)
    setupBridgeCommands(crepe, hasUserInteractedRef);

    if (!editable) crepe.setReadonly(true);
    return crepe;
  }, []);

  // Keep `get` in a ref to avoid re-triggering sync effect
  const getRef = useRef(get);
  getRef.current = get;

  // NodeView post-processing hooks
  useLocalImage(filePath, containerRef, content);
  useHtmlBlocks(containerRef, content);

  // AI Copilot bridge + selection tracking
  useMilkdownBridge(crepeRef, containerRef, contentRef, onContentChangeRef, hasUserInteractedRef);

  // DOM event effects + get syncContent helper
  const { syncContent } = useMilkdownEvents(
    crepeRef, containerRef, isExternalUpdate, hasUserInteractedRef,
    lastContentRef, filePath, editable, onWikiLinkNavigate, onOpenFile,
  );

  // Sync external content changes → Milkdown
  useEffect(() => {
    syncContent(body, () => getRef.current());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

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
    (newContent: string) => { onContentChange?.(newContent); },
    [onContentChange],
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
