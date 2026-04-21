import { lazy, Suspense, Component } from 'react';
import type { RefObject, ReactNode, ErrorInfo } from 'react';
import type { Extension } from '@codemirror/state';
import type { ViewUpdate } from '@uiw/react-codemirror';
import CodeMirror from '@uiw/react-codemirror';
import type { EditorView } from '@codemirror/view';
import Split from 'react-split';
import { saveSplitSizes } from '../../lib/editor';
import { THEMES, type ThemeName } from '../../lib/theme';
import { WelcomePage, EmptyEditorState } from '../welcome/WelcomePage';
import { useI18n } from '../../i18n';
import type { Tab } from '../../types';
import type { ViewMode } from '../../types';
import type { RecentFile } from '../../lib/file';

const MarkdownPreview = lazy(() =>
  import('../preview/MarkdownPreview').then((m) => ({ default: m.MarkdownPreview }))
);

const MilkdownPreview = lazy(() =>
  import('../milkdown').then((m) => ({ default: m.MilkdownPreview }))
);

const EDITOR_SETUP = { lineNumbers: true, foldGutter: true, highlightActiveLine: true, tabSize: 2 };

interface EditorContentAreaProps {
  isPristine: boolean;
  welcomeDismissed: boolean;
  viewMode: ViewMode;
  activeTabId: string;
  activeTab: Tab;
  splitSizes: [number, number];
  onSplitDragEnd: (sizes: [number, number]) => void;
  editorRef: RefObject<HTMLDivElement | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  handleEditorScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  handlePreviewScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  editorTheme: 'light' | 'dark' | Extension;
  editorExtensions: Extension[];
  updateActiveDoc: (value: string) => void;
  handleCreateEditor: (view: EditorView) => void;
  handleEditorUpdate: (viewUpdate: ViewUpdate) => void;
  spellCheck: boolean;
  debouncedDoc: string;
  openFileInTab: (path: string) => Promise<void>;
  handleWikiLinkNavigate: (target: string) => Promise<void>;
  theme: ThemeName;
  recentFiles: RecentFile[];
  onNew: () => void;
  onOpenFile: () => void;
  onOpenFolder?: () => void;
  onOpenRecent: (filePath: string) => Promise<void>;
  onOpenSample: () => void;
  onNewWithContent?: (content: string, displayName?: string) => void;
  onDismiss: () => void;
  onShowWelcome: () => void;
  pluginRenderers?: Map<string, unknown>;
  /** Use Milkdown as the preview engine (default: true) */
  useMilkdownPreview?: boolean;
  /** Right-click on preview pane */
  onPreviewContextMenu?: (x: number, y: number) => void;
}

function PreviewFallback() {
  const { t } = useI18n();
  return (
    <div className="p-4 text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>
      {t('loading.previewEngine')}
    </div>
  );
}

/** Catches Milkdown init errors and falls back to MarkdownPreview */
class PreviewErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MilkdownPreview] Initialization failed, falling back:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function EditorContentArea({
  isPristine,
  welcomeDismissed,
  viewMode,
  activeTabId,
  activeTab,
  splitSizes,
  onSplitDragEnd,
  editorRef,
  previewRef,
  handleEditorScroll,
  handlePreviewScroll,
  editorTheme,
  editorExtensions,
  updateActiveDoc,
  handleCreateEditor,
  handleEditorUpdate,
  spellCheck,
  debouncedDoc,
  openFileInTab,
  handleWikiLinkNavigate,
  theme,
  recentFiles,
  onNew,
  onOpenFile,
  onOpenFolder,
  onOpenRecent,
  onNewWithContent,
  onOpenSample,
  onDismiss,
  onShowWelcome,
  pluginRenderers,
  useMilkdownPreview = true,
  onPreviewContextMenu,
}: EditorContentAreaProps) {
  if (isPristine) {
    return welcomeDismissed ? (
      <EmptyEditorState onShowWelcome={onShowWelcome} />
    ) : (
      <WelcomePage
        recentFiles={recentFiles}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenFolder={onOpenFolder}
        onOpenRecent={onOpenRecent}
        onNewWithContent={onNewWithContent}
        onOpenSample={onOpenSample}
        onDismiss={onDismiss}
      />
    );
  }

  // WYSIWYG mode: when Milkdown editable preview is on, force preview-only view
  const effectiveViewMode = useMilkdownPreview ? 'preview' : viewMode;

  const previewClass = `markdown-preview max-w-full min-h-full ${THEMES[theme].previewClass}`;
  const PreviewComponent = useMilkdownPreview ? MilkdownPreview : MarkdownPreview;

  const previewFallbackEl = (
    <Suspense fallback={<PreviewFallback />}>
      <MarkdownPreview
        content={debouncedDoc}
        filePath={activeTab.filePath ?? undefined}
        onOpenFile={openFileInTab}
        className={previewClass}
        pluginRenderers={pluginRenderers}
      />
    </Suspense>
  );

  const renderPreview = () => (
    <PreviewErrorBoundary fallback={previewFallbackEl}>
      <Suspense fallback={<PreviewFallback />}>
        <PreviewComponent
          content={debouncedDoc}
          filePath={activeTab.filePath ?? undefined}
          onOpenFile={openFileInTab}
          onContentChange={updateActiveDoc}
          onWikiLinkNavigate={handleWikiLinkNavigate}
          className={previewClass}
          {...(!useMilkdownPreview ? { pluginRenderers } : {})}
        />
      </Suspense>
    </PreviewErrorBoundary>
  );

  if (effectiveViewMode === 'split') {
    return (
      <Split
        sizes={splitSizes}
        onDragEnd={(sizes) => {
          const [a, b] = sizes as [number, number];
          if (Math.abs(a + b - 100) < 0.5) {
            onSplitDragEnd([a, b]);
            saveSplitSizes([a, b]);
          }
        }}
        minSize={250}
        expandToMin={false}
        gutterSize={5}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
        cursor="col-resize"
        className="flex h-full min-w-0 overflow-hidden"
        style={{ flex: 1 }}
      >
        <div className="h-full overflow-y-auto overflow-x-hidden min-w-0" ref={editorRef} onScroll={handleEditorScroll}>
          <div className="min-h-full w-full">
            <CodeMirror
              key={activeTabId}
              value={activeTab.doc}
              className="text-sm"
              theme={editorTheme}
              extensions={editorExtensions}
              onChange={updateActiveDoc}
              onCreateEditor={handleCreateEditor}
              onUpdate={handleEditorUpdate}
              basicSetup={EDITOR_SETUP}
              spellCheck={spellCheck}
            />
          </div>
        </div>
        <div
          className="h-full overflow-auto border-l min-w-0"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
          ref={previewRef}
          onScroll={handlePreviewScroll}
          onContextMenu={(e) => { e.preventDefault(); onPreviewContextMenu?.(e.clientX, e.clientY); }}
        >
          <div className="p-8">
            {renderPreview()}
          </div>
        </div>
      </Split>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden">
      {effectiveViewMode === 'edit' ? (
        <div className="w-full h-full overflow-auto min-w-0">
          <CodeMirror
            key={activeTabId}
            value={activeTab.doc}
            height="100%"
            className="h-full text-sm"
            theme={editorTheme}
            extensions={editorExtensions}
            onChange={updateActiveDoc}
            onCreateEditor={handleCreateEditor}
            onUpdate={handleEditorUpdate}
            basicSetup={EDITOR_SETUP}
            spellCheck={spellCheck}
          />
        </div>
      ) : (
        <div
          ref={previewRef}
          className="w-full h-full overflow-auto min-w-0"
          style={{ backgroundColor: 'var(--bg-primary)' }}
          onContextMenu={(e) => { e.preventDefault(); onPreviewContextMenu?.(e.clientX, e.clientY); }}
        >
          <div className="p-8">
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  );
}
