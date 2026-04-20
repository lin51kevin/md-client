
import { useRef, useState, useEffect } from 'react';
import { PanelLeftClose, PanelRightClose, Columns2, Type, Monitor, Maximize, Minimize, SpellCheck, ImagePlus, Link2, Bold, Italic, Strikethrough, Code, Heading, Quote, ListOrdered, Link, Terminal, HelpCircle, FilePlus, FileText, FolderOpen as FolderOpenIcon, Save, SaveAll, ChevronLeft, ChevronRight, Table2, FileCode2, Minus, ListChecks, Sigma, Presentation, Library, List, Brain, Undo2, Redo2, Bot, ArrowUpFromLine, PenLine } from 'lucide-react';
import { ViewMode, FocusMode } from '../../types';

import { FileMenuDropdown } from '../editor/FileMenuDropdown';
import { ToolbarButton } from './ToolbarButton';
import { TableSizePicker } from '../modal/TableSizePicker';
import { useI18n } from '../../i18n';

interface ToolbarProps {
  viewMode: ViewMode;
  focusMode: FocusMode;
  onNewTab: () => void;
  onOpenFile: () => void;
  onOpenFolder?: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onExportHtml: () => void;
  onExportEpub?: () => void;
  onExportPng?: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onFocusModeChange?: (mode: FocusMode) => void;
  /** F013: 拼写检查状态 */
  spellCheck?: boolean;
  /** F013: 拼写检查切换回调 */
  onToggleSpellCheck?: () => void;
  /** F014: 格式化操作回调 */
  onFormatAction?: (action: string) => void;
  /** F014: Vim 模式状态 */
  vimMode?: boolean;
  /** F014: Vim 模式切换回调 */
  onToggleVimMode?: () => void;
  /** 打开帮助/用户指南 */
  onOpenHelp?: () => void;
  /** 打开关于对话框 */
  onOpenAbout?: () => void;
  /** AI Copilot: 是否已启用（插件已激活） */
  aiCopilotEnabled?: boolean;
  /** AI Copilot: 聊天面板当前是否打开 */
  showAIPanel?: boolean;
  /** AI Copilot: 切换聊天面板 */
  onToggleAIPanel?: () => void;
  /** F013: 最近文件列表 */
  recentFiles?: import('../../lib/file').RecentFile[];
  /** F013: 打开最近文件 */
  onOpenRecent?: (filePath: string) => void;
  /** F013: 清空最近文件 */
  onClearRecent?: () => void;
  /** F013: 移除单个最近文件 */
  onRemoveRecent?: (filePath: string) => void;
  /** 关闭所有非固定标签页 */
  onCloseAll?: () => void;
  /** Tab navigation: list of open tabs */
  tabs?: import('../../types').Tab[];
  /** Tab navigation: current active tab id */
  activeTabId?: string;
  /** Tab navigation: activate a tab by id */
  onActivateTab?: (id: string) => void;
  /** 打开片段选择器 */
  onInsertSnippet?: () => void;
  /** Undo/Redo state */
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  /** WYSIWYG mode: when true, hide source-editing UI (view switcher, formatting, undo/redo, vim, spellcheck, focus modes) */
  wysiwygMode?: boolean;
  /** Toggle WYSIWYG / read-only preview mode */
  onToggleWysiwygMode?: () => void;
}

const DIVIDER = (
  <div className="w-px h-5 mx-0.5 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />
);

export function Toolbar({
  viewMode, focusMode,
  onNewTab, onOpenFile, onOpenFolder, onSaveFile, onSaveAsFile,
  onExportDocx, onExportPdf, onExportHtml, onExportEpub, onExportPng,
  onSetViewMode, onFocusModeChange,
  spellCheck, onToggleSpellCheck,
  onFormatAction,
  recentFiles, onOpenRecent, onClearRecent, onRemoveRecent,
  vimMode, onToggleVimMode, onImageLocal, onOpenAbout,
  aiCopilotEnabled, showAIPanel, onToggleAIPanel,
  tabs, activeTabId, onActivateTab, onCloseAll, onInsertSnippet,
  canUndo, canRedo, onUndo, onRedo,
  wysiwygMode = false,
  onToggleWysiwygMode,
}: ToolbarProps & { onImageLocal?: () => void }) {
  const { t } = useI18n();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on click outside
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const focusable = Array.from(toolbar.querySelectorAll<HTMLElement>('[tabindex="0"],button:not([disabled])'))
      .filter(el => el !== toolbar && el.offsetWidth > 0 && el.offsetHeight > 0);
    if (focusable.length === 0) return;
    const idx = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIdx = idx === -1
      ? (e.key === 'ArrowRight' ? 0 : focusable.length - 1)
      : e.key === 'ArrowRight'
        ? (idx + 1) % focusable.length
        : (idx - 1 + focusable.length) % focusable.length;
    focusable[nextIdx].focus();
    e.preventDefault();
  };

  const tabList = tabs ?? [];
  const activeIdx = tabList.findIndex((tab) => tab.id === activeTabId);
  const prevTabId = activeIdx > 0 ? tabList[activeIdx - 1].id : null;
  const nextTabId =
    activeIdx >= 0 && activeIdx < tabList.length - 1 ? tabList[activeIdx + 1].id : null;

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={t('toolbar.label')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative shrink-0 flex items-center justify-between px-2 py-1"
      style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
    >
      {/* ── Left: file menu + file ops + formatting ── */}
      <div className="flex items-center">
        <FileMenuDropdown
          onNewTab={onNewTab}
          onOpenFile={onOpenFile}
          onOpenFolder={onOpenFolder}
          onSaveFile={onSaveFile}
          onSaveAsFile={onSaveAsFile}
          onExportDocx={onExportDocx}
          onExportPdf={onExportPdf}
          onExportHtml={onExportHtml}
          onExportEpub={onExportEpub}
          onExportPng={onExportPng}
          recentFiles={recentFiles}
          onOpenRecent={onOpenRecent}
          onClearRecent={onClearRecent}
          onRemoveRecent={onRemoveRecent}
          onCloseAll={onCloseAll}
        />

        {/* 文件操作 */}
        <ToolbarButton onClick={() => onNewTab()} title={t('file.new')} className="px-2.5">
          <FilePlus size={14} strokeWidth={1.8} />
        </ToolbarButton>
        <ToolbarButton onClick={onOpenFile} title={t('file.open')} className="px-2.5">
          <FileText size={14} strokeWidth={1.8} />
        </ToolbarButton>
        <ToolbarButton onClick={onOpenFolder} title={t('file.openFolder')} className="px-2.5">
          <FolderOpenIcon size={14} strokeWidth={1.8} />
        </ToolbarButton>
        <ToolbarButton onClick={onSaveFile} title={t('file.save')} className="px-2.5">
          <Save size={14} strokeWidth={1.8} />
        </ToolbarButton>
        <ToolbarButton onClick={onSaveAsFile} title={t('file.saveAs')} className="px-2.5">
          <SaveAll size={14} strokeWidth={1.8} />
        </ToolbarButton>

        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Undo / Redo — always visible */}
        <ToolbarButton disabled={!canUndo} onClick={onUndo} title={t('toolbar.undo')}>
          <Undo2 size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton disabled={!canRedo} onClick={onRedo} title={t('toolbar.redo')}>
          <Redo2 size={14} strokeWidth={2} />
        </ToolbarButton>

        {!wysiwygMode && (<>
          {/* 格式化 */}
          <ToolbarButton onClick={() => onFormatAction?.('bold')} title={t('toolbar.bold')}>
            <Bold size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('italic')} title={t('toolbar.italic')}>
            <Italic size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('strikethrough')} title={t('toolbar.strikethrough')}>
            <Strikethrough size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('code')} title={t('toolbar.code')}>
            <Code size={14} strokeWidth={2} />
          </ToolbarButton>

          {DIVIDER}

          <ToolbarButton onClick={() => onFormatAction?.('heading')} title={t('toolbar.heading')}>
            <Heading size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('blockquote')} title={t('toolbar.blockquote')}>
            <Quote size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('ul')} title={t('toolbar.ul')}>
            <List size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('ol')} title={t('toolbar.ol')}>
            <ListOrdered size={14} strokeWidth={2} />
          </ToolbarButton>

          {DIVIDER}

          <ToolbarButton onClick={() => onFormatAction?.('link')} title={t('toolbar.link')}>
            <Link size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onImageLocal?.()} title={t('toolbar.imageLocal')}>
            <ImagePlus size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('image-link')} title={t('toolbar.imageLink')}>
            <Link2 size={14} strokeWidth={2} />
          </ToolbarButton>

          {DIVIDER}

          {/* 插入表格 */}
          <div className="relative">
            <ToolbarButton onClick={() => setShowTablePicker(v => !v)} title={t('toolbar.table')}>
              <Table2 size={14} strokeWidth={2} />
            </ToolbarButton>
            {showTablePicker && (
              <TableSizePicker
                onSelect={(rows, cols) => onFormatAction?.(`table:${rows}x${cols}`)}
                onClose={() => setShowTablePicker(false)}
              />
            )}
          </div>
          <ToolbarButton onClick={() => onFormatAction?.('codeblock')} title={t('toolbar.codeblock')}>
            <FileCode2 size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('hr')} title={t('toolbar.hr')}>
            <Minus size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('task')} title={t('toolbar.task')}>
            <ListChecks size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('math')} title={t('toolbar.math')}>
            <Sigma size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={onInsertSnippet} title={t('toolbar.insertSnippet')}>
            <Library size={14} strokeWidth={1.8} />
          </ToolbarButton>
        </>)}
      </div>

      {/* ── Center: tab navigation (VS Code title-bar style) ── */}
      {tabList.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 pointer-events-none select-none">
          <button
            disabled={!prevTabId}
            onClick={() => prevTabId && onActivateTab?.(prevTabId)}
            title={t('toolbar.prevTab')}
            className="pointer-events-auto flex items-center justify-center w-6 h-6 rounded disabled:opacity-25 disabled:cursor-default"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              if (prevTabId) {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ChevronLeft size={16} strokeWidth={1.8} />
          </button>
          <button
            disabled={!nextTabId}
            onClick={() => nextTabId && onActivateTab?.(nextTabId)}
            title={t('toolbar.nextTab')}
            className="pointer-events-auto flex items-center justify-center w-6 h-6 rounded disabled:opacity-25 disabled:cursor-default"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              if (nextTabId) {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ChevronRight size={16} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* ── Right: toggles + view mode + settings ── */}
      <div className="flex items-center gap-0.5">
        {/* AI Copilot 聊天面板切换 — 仅插件启用时展示 */}
        {aiCopilotEnabled && (
          <ToolbarButton
            variant="toggle"
            active={!!showAIPanel}
            onClick={onToggleAIPanel}
            title={showAIPanel ? t('toolbar.aiCopilotClose') : t('toolbar.aiCopilotOpen')}
          >
            <Bot size={14} strokeWidth={1.8} />
          </ToolbarButton>
        )}

        {!wysiwygMode && (<>
          {/* F013 — 拼写检查 */}
          <ToolbarButton
            variant="toggle"
            active={!!spellCheck}
            onClick={onToggleSpellCheck}
            title={spellCheck ? t('toolbar.spellCheckOff') : t('toolbar.spellCheckOn')}
          >
            <SpellCheck size={14} strokeWidth={1.8} />
          </ToolbarButton>

          {/* F014 — Vim 模式 */}
          <ToolbarButton
            variant="toggle"
            active={!!vimMode}
            onClick={onToggleVimMode}
            title={vimMode ? t('toolbar.vimModeOff') : t('toolbar.vimModeOn')}
          >
            <Terminal size={14} strokeWidth={1.8} />
          </ToolbarButton>

          {DIVIDER}

          {/* F009 — 打字机模式 */}
          <ToolbarButton
            variant="toggle"
            active={focusMode === 'typewriter'}
            onClick={() => onFocusModeChange?.('typewriter')}
            title={t('toolbar.typewriter')}
          >
            <Type size={14} strokeWidth={1.8} />
          </ToolbarButton>

          {/* F009 — 焦点模式 */}
          <ToolbarButton
            variant="toggle"
            active={focusMode === 'focus'}
            onClick={() => onFocusModeChange?.('focus')}
            title={t('toolbar.focus')}
          >
            <Monitor size={14} strokeWidth={1.8} />
          </ToolbarButton>

          {/* F009 — 全屏 */}
          <ToolbarButton
            variant="toggle"
            active={focusMode === 'fullscreen'}
            onClick={() => onFocusModeChange?.(focusMode === 'fullscreen' ? 'normal' : 'fullscreen')}
            title={t('toolbar.fullscreen')}
          >
            {focusMode === 'fullscreen' ? (
              <Minimize size={14} strokeWidth={1.8} />
            ) : (
              <Maximize size={14} strokeWidth={1.8} />
            )}
          </ToolbarButton>

          {DIVIDER}

          {/* 视图模式 */}
          <ToolbarButton
            variant="view"
            active={viewMode === 'edit'}
            onClick={() => onSetViewMode('edit')}
            title={t('toolbar.editOnly')}
          >
            <PanelRightClose size={15} strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton
            variant="view"
            active={viewMode === 'split'}
            onClick={() => onSetViewMode('split')}
            title={t('toolbar.split')}
          >
            <Columns2 size={15} strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton
            variant="view"
            active={viewMode === 'preview'}
            onClick={() => onSetViewMode('preview')}
            title={t('toolbar.previewOnly')}
          >
            <PanelLeftClose size={15} strokeWidth={1.8} />
          </ToolbarButton>
        </>)}

        {/* 幻灯片/思维导图 — always visible */}
        <ToolbarButton
          variant="view"
          active={viewMode === 'slide'}
          onClick={() => onSetViewMode('slide')}
          title={t('toolbar.slideMode') || 'Slide Show (Ctrl+4)'}
        >
          <Presentation size={15} strokeWidth={1.8} />
        </ToolbarButton>
        <ToolbarButton
          variant="view"
          active={viewMode === 'mindmap'}
          onClick={() => onSetViewMode('mindmap')}
          title={t('toolbar.mindmapMode') || 'Mindmap (Ctrl+5)'}
        >
          <Brain size={15} strokeWidth={1.8} />
        </ToolbarButton>

        {/* 预览可编辑切换 — always visible */}
        {DIVIDER}
        <ToolbarButton
          variant="toggle"
          active={wysiwygMode}
          onClick={onToggleWysiwygMode}
          title={t('toolbar.editablePreview')}
        >
          <PenLine size={14} strokeWidth={1.8} />
        </ToolbarButton>

        {/* 导出下拉按钮 — always visible */}
        <div className="relative" ref={exportMenuRef}>
          <ToolbarButton onClick={() => setShowExportMenu(v => !v)} title={t('toolbar.export') || 'Export'}>
            <ArrowUpFromLine size={14} strokeWidth={1.8} />
          </ToolbarButton>
          {showExportMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 py-1 rounded border shadow-lg min-w-[140px]"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
              onMouseLeave={() => setShowExportMenu(false)}
            >
              <button
                className="w-full text-left px-3 py-1.5 text-xs rounded hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}
                onClick={() => { onExportDocx(); setShowExportMenu(false); }}
              >Word (.docx)</button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs rounded hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}
                onClick={() => { onExportPdf(); setShowExportMenu(false); }}
              >PDF (.pdf)</button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs rounded hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}
                onClick={() => { onExportHtml(); setShowExportMenu(false); }}
              >HTML (.html)</button>
              {onExportEpub && (
                <button
                  className="w-full text-left px-3 py-1.5 text-xs rounded hover:opacity-80"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => { onExportEpub(); setShowExportMenu(false); }}
                >EPUB (.epub)</button>
              )}
              {onExportPng && (
                <button
                  className="w-full text-left px-3 py-1.5 text-xs rounded hover:opacity-80"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => { onExportPng(); setShowExportMenu(false); }}
                >PNG (.png)</button>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* 帮助 — 关于 */}
        <ToolbarButton onClick={onOpenAbout} title={t('about.title')}>
          <HelpCircle size={14} strokeWidth={1.8} />
        </ToolbarButton>
      </div>
    </div>
  );
}


