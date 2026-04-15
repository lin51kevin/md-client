import { useEffect, useRef, useCallback, memo } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { EditorState } from '@milkdown/prose/state';
import '@milkdown/crepe/theme/frame.css';
import 'katex/dist/katex.min.css';
import './theme.css';
import { useLocalImage, useMermaidBlock, useWikiLink, useFrontmatter } from './nodeviews';

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

  const { get } = useEditor((_root) => {
    const crepe = new Crepe({
      defaultValue: content,
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
          onContentChange?.(newMarkdown);
        }
      });
    });

    if (!editable) {
      crepe.setReadonly(true);
    }

    return crepe;
  }, []);

  // NodeView post-processing hooks
  useLocalImage(filePath, containerRef);
  useMermaidBlock(containerRef);
  useWikiLink(containerRef, onWikiLinkNavigate);
  useFrontmatter(containerRef, content);

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
      const doc = parser(content);
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
  }, [content, get]);

  // Handle editable changes
  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    crepe.setReadonly(!editable);
  }, [editable]);

  return <div ref={containerRef}><Milkdown /></div>;
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
