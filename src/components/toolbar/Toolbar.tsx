
import { useRef, useState, useEffect, memo } from 'react';
import { PanelLeftClose, PanelRightClose, Columns2, Type, Monitor, Maximize, Minimize, SpellCheck, ImagePlus, Link2, Bold, Italic, Strikethrough, Code, Heading, Quote, ListOrdered, Link, Terminal, HelpCircle, FilePlus, FileText, FolderOpen as FolderOpenIcon, Save, SaveAll, ChevronLeft, ChevronRight, Table2, FileCode2, Minus, ListChecks, Sigma, Library, List, Brain, Undo2, Redo2, Bot, ArrowUpFromLine, PenLine, IndentDecrease, ListRestart, ChevronsUp, ChevronsDown, AlignLeft, Pilcrow, Plus, MoreHorizontal } from 'lucide-react';
import { ViewMode, FocusMode } from '../../types';
import { isVimAvailable } from '../../lib/cm/vim-bridge';
import { useBridgeVersion } from '../../lib/cm/bridge-signal';

import { FileMenuDropdown } from '../editor/FileMenuDropdown';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarMenu, type ToolbarMenuItem } from './ToolbarMenu';
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
  onImportHtml?: () => void;
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
  /** When true, hide markdown-specific formatting buttons (file is not markdown) */
  isCodeFile?: boolean;
}

const DIVIDER = (
  <div className="w-px h-5 mx-0.5 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />
);

export const Toolbar = memo(function Toolbar({
  viewMode, focusMode,
  onNewTab, onOpenFile, onOpenFolder, onSaveFile, onSaveAsFile,
  onExportDocx, onExportPdf, onExportHtml, onExportEpub, onExportPng,
  onImportHtml,
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
  isCodeFile = false,
}: ToolbarProps & { onImageLocal?: () => void }) {
  const { t } = useI18n();
  // Re-render when plugin bridges change (e.g. vim becomes available)
  useBridgeVersion();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Responsive overflow: collapse secondary toggles into a "More" menu when the
  // toolbar becomes too narrow to show every button comfortably.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCompact(entry.contentRect.width < 1080);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // ── Grouped formatting menus (declutter the source-mode toolbar) ──────────
  const paragraphMenuItems: ToolbarMenuItem[] = [
    { id: 'heading', label: t('toolbar.heading'), icon: <Heading size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('heading') },
    { id: 'blockquote', label: t('toolbar.blockquote'), icon: <Quote size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('blockquote') },
    { id: 'strikethrough', label: t('toolbar.strikethrough'), icon: <Strikethrough size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('strikethrough') },
    { id: 'task', label: t('toolbar.task'), icon: <ListChecks size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('task') },
    { id: 'renumber-ol', label: t('toolbar.renumberOl'), icon: <ListRestart size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('renumber-ol') },
  ];
  const insertMenuItems: ToolbarMenuItem[] = [
    { id: 'image-local', label: t('toolbar.imageLocal'), icon: <ImagePlus size={14} strokeWidth={2} />, onClick: () => onImageLocal?.() },
    { id: 'image-link', label: t('toolbar.imageLink'), icon: <Link2 size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('image-link') },
    { id: 'codeblock', label: t('toolbar.codeblock'), icon: <FileCode2 size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('codeblock') },
    { id: 'hr', label: t('toolbar.hr'), icon: <Minus size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('hr') },
    { id: 'math', label: t('toolbar.math'), icon: <Sigma size={14} strokeWidth={2} />, onClick: () => onFormatAction?.('math') },
    { id: 'snippet', label: t('toolbar.insertSnippet'), icon: <Library size={14} strokeWidth={1.8} />, onClick: () => onInsertSnippet?.() },
  ];

  // ── Secondary toggles collapsed into a "More" menu when the toolbar is narrow
  const moreMenuItems: ToolbarMenuItem[] = [
    { id: 'spellCheck', label: t('toolbar.spellCheck'), icon: <SpellCheck size={14} strokeWidth={1.8} />, active: !!spellCheck, onClick: () => onToggleSpellCheck?.() },
    { id: 'vimMode', label: t('toolbar.vimMode'), icon: <Terminal size={14} strokeWidth={1.8} />, active: !!vimMode, disabled: !isVimAvailable(), onClick: () => onToggleVimMode?.() },
    { id: 'typewriter', label: t('toolbar.typewriter'), icon: <Type size={14} strokeWidth={1.8} />, active: focusMode === 'typewriter', onClick: () => onFocusModeChange?.('typewriter') },
    { id: 'focus', label: t('toolbar.focus'), icon: <Monitor size={14} strokeWidth={1.8} />, active: focusMode === 'focus', onClick: () => onFocusModeChange?.('focus') },
    { id: 'fullscreen', label: t('toolbar.fullscreen'), icon: <Maximize size={14} strokeWidth={1.8} />, active: focusMode === 'fullscreen', onClick: () => onFocusModeChange?.(focusMode === 'fullscreen' ? 'normal' : 'fullscreen') },
  ];

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={t('toolbar.label')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative shrink-0 flex items-center gap-1 px-2 py-1"
      style={{ outline: 'none', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
    >
      {/* ── Left: file menu + file ops + formatting ── */}
      <div className="flex items-center shrink-0">
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
          onImportHtml={onImportHtml}
          recentFiles={recentFiles}
          onOpenRecent={onOpenRecent}
          onClearRecent={onClearRecent}
          onRemoveRecent={onRemoveRecent}
          onCloseAll={onCloseAll}
        />

        {/* 文件操作 — 窄屏时收起（可从左侧 ☰ 菜单访问） */}
        {!compact && (<>
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
        </>)}

        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Undo / Redo — always visible */}
        <ToolbarButton disabled={!canUndo} onClick={onUndo} title={t('toolbar.undo')}>
          <Undo2 size={14} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton disabled={!canRedo} onClick={onRedo} title={t('toolbar.redo')}>
          <Redo2 size={14} strokeWidth={2} />
        </ToolbarButton>

        {/* 格式化文档 (代码文件 + Markdown 源码模式) */}
        {!wysiwygMode && (
          <ToolbarButton onClick={() => onFormatAction?.('format-document')} title={t('toolbar.formatDocument')}>
            <AlignLeft size={14} strokeWidth={2} />
          </ToolbarButton>
        )}

        {!wysiwygMode && !isCodeFile && (<>
          {DIVIDER}

          {/* 常用格式（内联） */}
          <ToolbarButton onClick={() => onFormatAction?.('bold')} title={t('toolbar.bold')}>
            <Bold size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('italic')} title={t('toolbar.italic')}>
            <Italic size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('code')} title={t('toolbar.code')}>
            <Code size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('link')} title={t('toolbar.link')}>
            <Link size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('ul')} title={t('toolbar.ul')}>
            <List size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('ol')} title={t('toolbar.ol')}>
            <ListOrdered size={14} strokeWidth={2} />
          </ToolbarButton>

          {/* 插入表格 — 保留悬停网格选择器 */}
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

          {DIVIDER}

          {/* 段落格式 — 下拉收纳 */}
          <ToolbarMenu
            icon={<Pilcrow size={14} strokeWidth={2} />}
            title={t('toolbar.paragraphGroup')}
            items={paragraphMenuItems}
          />
          {/* 插入内容 — 下拉收纳 */}
          <ToolbarMenu
            icon={<Plus size={14} strokeWidth={2} />}
            title={t('toolbar.insertGroup')}
            items={insertMenuItems}
          />
        </>)}

        {/* ── Milkdown (WYSIWYG) 模式下的列表 / 标题按钮 ────────────────── */}
        {wysiwygMode && !isCodeFile && (<>
          {DIVIDER}

          <ToolbarButton onClick={() => onFormatAction?.('ul')} title={t('toolbar.ul')}>
            <List size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('ol')} title={t('toolbar.ol')}>
            <ListOrdered size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('list-lift')} title={t('toolbar.listLift')}>
            <IndentDecrease size={14} strokeWidth={2} />
          </ToolbarButton>

          {DIVIDER}

          <ToolbarButton onClick={() => onFormatAction?.('heading-promote')} title={t('toolbar.headingPromote')}>
            <ChevronsUp size={14} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton onClick={() => onFormatAction?.('heading-demote')} title={t('toolbar.headingDemote')}>
            <ChevronsDown size={14} strokeWidth={2} />
          </ToolbarButton>

          {DIVIDER}

          {/* 重新编号按钮 — wysiwyg mode */}
          <ToolbarButton onClick={() => onFormatAction?.('renumber-ol')} title={t('toolbar.renumberOl')}>
            <ListRestart size={14} strokeWidth={2} />
          </ToolbarButton>
        </>)}
      </div>

      {/* ── Center: flexible spacer + tab navigation (VS Code title-bar style) ── */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        {tabList.length > 1 && (
          <div className="flex items-center gap-0.5 select-none">
            <button
              disabled={!prevTabId}
              onClick={() => prevTabId && onActivateTab?.(prevTabId)}
              title={t('toolbar.prevTab')}
              className="flex items-center justify-center w-6 h-6 rounded disabled:opacity-25 disabled:cursor-default"
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
              className="flex items-center justify-center w-6 h-6 rounded disabled:opacity-25 disabled:cursor-default"
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
      </div>

      {/* ── Right: toggles + view mode + settings ── */}
      <div className="flex items-center gap-0.5 shrink-0">
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

        {/* Code files always show utility buttons even if wysiwygMode is on (code files ignore wysiwyg) */}
        {(!wysiwygMode || isCodeFile) && (<>
          {compact ? (
            <ToolbarMenu
              icon={<MoreHorizontal size={14} strokeWidth={1.8} />}
              title={t('toolbar.moreGroup')}
              items={moreMenuItems}
              align="right"
            />
          ) : (<>
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
            disabled={!isVimAvailable()}
            title={!isVimAvailable() ? '请安装 Vim 插件' : (vimMode ? t('toolbar.vimModeOff') : t('toolbar.vimModeOn'))}
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
          </>)}

          {!isCodeFile && (<>
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
        </>)}

        {/* 思维导图 — only for markdown */}
        {!isCodeFile && (
          <ToolbarButton
            variant="view"
            active={viewMode === 'mindmap'}
            onClick={() => onSetViewMode('mindmap')}
            title={t('toolbar.mindmapMode') || 'Mindmap (Ctrl+5)'}
          >
            <Brain size={15} strokeWidth={1.8} />
          </ToolbarButton>
        )}

        {/* 预览可编辑切换 — only for markdown */}
        {!isCodeFile && (<>
          {DIVIDER}
          <ToolbarButton
            variant="toggle"
            active={wysiwygMode}
            onClick={onToggleWysiwygMode}
            title={t('toolbar.editablePreview')}
          >
            <PenLine size={14} strokeWidth={1.8} />
          </ToolbarButton>
        </>)}

        {/* 导出下拉按钮 — always visible */}
        {!isCodeFile && <div className="relative" ref={exportMenuRef}>
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
        </div>}

        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* 帮助 — 关于 */}
        <ToolbarButton onClick={onOpenAbout} title={t('about.title')}>
          <HelpCircle size={14} strokeWidth={1.8} />
        </ToolbarButton>
      </div>
    </div>
  );
});


