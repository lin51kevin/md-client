import { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { EditorState } from '@milkdown/prose/state';
import '@milkdown/crepe/theme/frame.css';
import 'katex/dist/katex.min.css';
import './theme.css';
import { extractFrontmatter, type Frontmatter } from '../../lib/markdown-extensions';
import { FrontmatterPanel } from './FrontmatterPanel';
import { useLocalImage, wikiLinkPlugin } from './nodeviews';
import { renderMermaidPreview } from './nodeviews/MermaidBlockView';

/** Convert a Frontmatter object back to YAML string (without --- delimiters) */
function frontmatterToYaml(fm: Frontmatter): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(fm)) {
    if (Array.isArray(val)) {
      lines.push(`${key}:`);
      for (const item of val as string[]) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${key}: ${String(val)}`);
    }
  }
  return lines.join('\n') + '\n';
}

interface MilkdownPreviewProps {
  content: string;
  onContentChange?: (newContent: string) => void;
  editable?: boolean;
  className?: string;
  filePath?: string;
  /** Called when user clicks a [[wiki-link]] */
  onWikiLinkNavigate?: (target: string) => void;
}

function MilkdownEditor({
  content,
  onContentChange,
  editable = true,
  filePath,
  onWikiLinkNavigate,
}: {
  content: string;
  onContentChange?: (newContent: string) => void;
  editable: boolean;
  filePath?: string;
  onWikiLinkNavigate?: (target: string) => void;
}) {
  const isExternalUpdate = useRef(false);
  const crepeRef = useRef<Crepe | null>(null);
  const lastContentRef = useRef(content);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract frontmatter once per content change
  const { frontmatter, body } = useMemo(() => {
    const fm = extractFrontmatter(content);
    const b = content.replace(/^---[\s\S]*?---\n?/, '').replace(/^\n+/, '');
    return { frontmatter: fm, body: b };
  }, [content]);

  // Keep a ref so markdownUpdated callback can reconstruct full content
  const frontmatterRef = useRef(frontmatter);
  frontmatterRef.current = frontmatter;

  const { get } = useEditor((_root) => {
    const crepe = new Crepe({
      defaultValue: body,
      featureConfigs: {
        [CrepeFeature.CodeMirror]: {
          renderPreview: renderMermaidPreview,
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
          return;
        }
        if (newMarkdown !== prevMarkdown) {
          lastContentRef.current = newMarkdown;
          // Reconstruct full content with frontmatter
          const fm = frontmatterRef.current;
          const fullContent = Object.keys(fm).length > 0
            ? `---\n${frontmatterToYaml(fm)}---\n${newMarkdown}`
            : newMarkdown;
          onContentChange?.(fullContent);
        }
      });
    });

    if (!editable) {
      crepe.setReadonly(true);
    }

    return crepe;
  }, []);

  // Register wiki-link Milkdown plugin
  useEffect(() => {
    const editor = get();
    if (editor) {
      editor.use(wikiLinkPlugin as any);
    }
  }, [get]);

  // NodeView post-processing hooks
  useLocalImage(filePath, containerRef, content);

  // WikiLink click delegation
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onWikiLinkNavigate) return;

    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.wiki-link');
      if (!target) return;
      e.preventDefault();
      const wikiTarget = target.getAttribute('data-wiki-target');
      if (wikiTarget) {
        onWikiLinkNavigate(wikiTarget);
      }
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [containerRef, onWikiLinkNavigate]);

  // Sync external content changes → Milkdown
  useEffect(() => {
    const crepe = crepeRef.current;
    const editor = get();
    if (!crepe || !editor) return;

    if (content === lastContentRef.current) return;

    isExternalUpdate.current = true;
    editor.action((ctx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const view = (ctx as any).get('editorView');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parser = (ctx as any).get('parser');
      const doc = parser(body);
      view.update(
        EditorState.create({
          doc,
          plugins: view.state.plugins,
        })
      );
    });
    lastContentRef.current = content;
    requestAnimationFrame(() => {
      isExternalUpdate.current = false;
    });
  }, [content, body, get]);

  // Handle editable changes
  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    crepe.setReadonly(!editable);
  }, [editable]);

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
  onWikiLinkNavigate,
}: MilkdownPreviewProps) {
  const handleContentChange = useCallback(
    (newContent: string) => {
      onContentChange?.(newContent);
    },
    [onContentChange]
  );

  return (
    <MilkdownProvider>
      <div className={className ?? 'milkdown-preview'}>
        <MilkdownEditor
          content={content}
          onContentChange={handleContentChange}
          editable={editable}
          filePath={filePath}
          onWikiLinkNavigate={onWikiLinkNavigate}
        />
      </div>
    </MilkdownProvider>
  );
});
