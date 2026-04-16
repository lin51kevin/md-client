import { lazy, Suspense, Component } from 'react';
import type { RefObject, ReactNode, ErrorInfo } from 'react';
import type { Extension } from '@codemirror/state';
import type { ViewUpdate } from '@uiw/react-codemirror';
import CodeMirror from '@uiw/react-codemirror';
import type { EditorView } from '@codemirror/view';
import Split from 'react-split';
import { saveSplitSizes } from '../lib/split-preference';
import { THEMES, type ThemeName } from '../lib/theme';
import { WelcomePage, EmptyEditorState } from './WelcomePage';
import type { Tab } from '../types';
import type { ViewMode } from '../types';
import type { RecentFile } from '../lib/recent-files';

const MarkdownPreview = lazy(() =>
  import('./MarkdownPreview').then((m) => ({ default: m.MarkdownPreview }))
);

const MilkdownPreview = lazy(() =>
  import('./MilkdownPreview').then((m) => ({ default: m.MilkdownPreview }))
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
  onOpenRecent: (filePath: string) => Promise<void>;
  onOpenSample: () => void;
  onDismiss: () => void;
  onShowWelcome: () => void;
  pluginRenderers?: Map<string, unknown>;
  /** Use Milkdown as the preview engine (default: true) */
  useMilkdownPreview?: boolean;
}

const PreviewFallback = (
  <div className="p-4 text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>
    正在加载预览引擎...
  </div>
);

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
  onOpenRecent,
  onOpenSample,
  onDismiss,
  onShowWelcome,
  pluginRenderers,
  useMilkdownPreview = true,
}: EditorContentAreaProps) {
  if (isPristine) {
    return welcomeDismissed ? (
      <EmptyEditorState onShowWelcome={onShowWelcome} />
    ) : (
      <WelcomePage
        recentFiles={recentFiles}
        onNew={onNew}
        onOpenFile={onOpenFile}
        onOpenRecent={onOpenRecent}
        onOpenSample={onOpenSample}
        onDismiss={onDismiss}
      />
    );
  }

  const previewClass = `markdown-preview max-w-full min-h-full ${THEMES[theme].previewClass}`;
  const PreviewComponent = useMilkdownPreview ? MilkdownPreview : MarkdownPreview;

  const previewFallbackEl = (
    <Suspense fallback={PreviewFallback}>
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
      <Suspense fallback={PreviewFallback}>
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

  if (viewMode === 'split') {
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
        className="flex h-full"
        style={{ flex: 1 }}
      >
        <div className="h-full overflow-y-auto overflow-x-hidden" ref={editorRef} onScroll={handleEditorScroll}>
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
          className="h-full overflow-auto border-l"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
          ref={previewRef}
          onScroll={handlePreviewScroll}
        >
          <div className="p-8">
            {renderPreview()}
          </div>
        </div>
      </Split>
    );
  }

  return (
    <div className="flex h-full w-full">
      {viewMode === 'edit' ? (
        <div className="w-full h-full overflow-auto">
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
          className="w-full h-full overflow-auto"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div className="p-8">
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  );
}
