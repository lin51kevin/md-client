
import { PanelLeftClose, PanelRightClose, Columns2, Type, Monitor, Maximize, Minimize, List, SpellCheck, FolderTree, Search, ImagePlus, Link2, Bold, Italic, Strikethrough, Code, Heading, Quote, ListOrdered, Link } from 'lucide-react';
import { ViewMode, FocusMode } from '../types';
import type { ThemeName } from '../lib/theme';
import { FileMenuDropdown } from './FileMenuDropdown';

interface ToolbarProps {
  viewMode: ViewMode;
  focusMode: FocusMode;
  showToc?: boolean;
  onNewTab: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onExportHtml: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onFocusModeChange?: (mode: FocusMode) => void;
  onToggleToc?: () => void;
  onThemeChange?: (theme: ThemeName) => void;
  currentTheme?: ThemeName;
  /** F013: 拼写检查状态 */
  spellCheck?: boolean;
  /** F013: 拼写检查切换回调 */
  onToggleSpellCheck?: () => void;
  /** F014: 文件树显示状态 */
  showFileTree?: boolean;
  /** F014: 文件树切换回调 */
  onToggleFileTree?: () => void;
  /** 搜索与替换面板按鈕回调 */
  onToggleSearch?: () => void;
  showSearch?: boolean;
  /** F014: 格式化操作回调 */
  onFormatAction?: (action: string) => void;
  /** F013: 最近文件列表 */
  recentFiles?: import('../lib/recent-files').RecentFile[];
  /** F013: 打开最近文件 */
  onOpenRecent?: (filePath: string) => void;
  /** F013: 清空最近文件 */
  onClearRecent?: () => void;
}

export function Toolbar({ viewMode, focusMode, showToc, showFileTree, currentTheme, onNewTab, onOpenFile, onSaveFile, onSaveAsFile, onExportDocx, onExportPdf, onExportHtml, onSetViewMode, onFocusModeChange, onToggleToc, onThemeChange, spellCheck, onToggleSpellCheck, onToggleFileTree, onToggleSearch, showSearch, onFormatAction, recentFiles, onOpenRecent, onClearRecent, onImageLocal }: ToolbarProps & { onImageLocal?: () => void }) {
  const btnCls = 'flex items-center gap-1.5 px-2.5 py-1 text-xs hover:shadow-sm border border-transparent rounded transition-all';
  const viewBtnCls = (active: boolean) =>
    'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-all ' +
    (active
      ? 'shadow-sm font-medium'
      : 'border-transparent');

  const focusBtnCls = (active: boolean) =>
    'flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-all ' +
    (active
      ? ''
      : 'border-transparent');

  return (
    <div className="shrink-0 flex items-center justify-between px-2 py-1" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="flex items-center">
        {/* 文件菜单下拉 (方案A) */}
        <FileMenuDropdown
          onNewTab={onNewTab}
          onOpenFile={onOpenFile}
          onSaveFile={onSaveFile}
          onSaveAsFile={onSaveAsFile}
          onExportDocx={onExportDocx}
          onExportPdf={onExportPdf}
          onExportHtml={onExportHtml}
          recentFiles={recentFiles}
          onOpenRecent={onOpenRecent}
          onClearRecent={onClearRecent}
        />



        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
        {/* F014 — 格式化工具栏 */}
        <button onClick={() => onFormatAction?.('bold')} title="加粗 (Ctrl+B)" className={btnCls}>
          <Bold size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onFormatAction?.('italic')} title="斜体 (Ctrl+I)" className={btnCls}>
          <Italic size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onFormatAction?.('strikethrough')} title="删除线" className={btnCls}>
          <Strikethrough size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onFormatAction?.('code')} title="行内代码 (Ctrl+`)" className={btnCls}>
          <Code size={14} strokeWidth={2} />
        </button>
        <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-color)' }} />
        <button onClick={() => onFormatAction?.('heading')} title="标题" className={btnCls}>
          <Heading size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onFormatAction?.('blockquote')} title="引用" className={btnCls}>
          <Quote size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onFormatAction?.('ul')} title="无序列表" className={btnCls}>
          <List size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onFormatAction?.('ol')} title="有序列表" className={btnCls}>
          <ListOrdered size={14} strokeWidth={2} />
        </button>
        <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-color)' }} />
        <button onClick={() => onFormatAction?.('link')} title="插入链接" className={btnCls}>
          <Link size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onImageLocal?.()} title="打开本地图片" className={btnCls}>
          <ImagePlus size={14} strokeWidth={2} />
        </button>
        <button onClick={() => onFormatAction?.('image-link')} title="插入图片链接" className={btnCls}>
          <Link2 size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="flex items-center gap-0.5">
        {/* F014 — 文件树切换 */}
        <button
          onClick={onToggleFileTree}
          title="文件树"
          className={focusBtnCls(!!showFileTree)}
          style={{
            backgroundColor: showFileTree ? 'var(--accent-bg)' : 'transparent',
            borderColor: showFileTree ? 'var(--accent-color)' : 'transparent',
            color: showFileTree ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (!showFileTree) {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showFileTree) {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <FolderTree size={14} strokeWidth={1.8} />
        </button>

        {/* 搜索与替换 */}
        <button
          onClick={onToggleSearch}
          title="搜索与替换"
          className={focusBtnCls(!!showSearch)}
          style={{
            backgroundColor: showSearch ? 'var(--accent-bg)' : 'transparent',
            borderColor: showSearch ? 'var(--accent-color)' : 'transparent',
            color: showSearch ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (!showSearch) {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showSearch) {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Search size={14} strokeWidth={1.8} />
        </button>

        {/* F010 — 大纲导航切换 */}
        <button
          onClick={onToggleToc}
          title="大纲导航"
          className={focusBtnCls(!!showToc)}
          style={{
            backgroundColor: showToc ? 'var(--accent-bg)' : 'transparent',
            borderColor: showToc ? 'var(--accent-color)' : 'transparent',
            color: showToc ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (!showToc) {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showToc) {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <List size={14} strokeWidth={1.8} />
        </button>

        {/* F013 — 拼写检查切换 */}
        <button
          onClick={onToggleSpellCheck}
          title={spellCheck ? '关闭拼写检查' : '开启拼写检查'}
          className={focusBtnCls(!!spellCheck)}
          style={{
            backgroundColor: spellCheck ? 'var(--accent-bg)' : 'transparent',
            borderColor: spellCheck ? 'var(--accent-color)' : 'transparent',
            color: spellCheck ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (!spellCheck) {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (!spellCheck) {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <SpellCheck size={14} strokeWidth={1.8} />
        </button>

        {/* F011 — 主题切换（亮/暗 toggle） */}
        <button
          onClick={() => onThemeChange?.(currentTheme === 'dark' ? 'light' : 'dark')}
          title={currentTheme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          className={focusBtnCls(false)}
          style={{
            color: 'var(--text-secondary)',
            borderColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = '';
          }}
        >
          {currentTheme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-color)' }} />
        {/* F009 — 焦点模式切换 */}
        <button
          onClick={() => onFocusModeChange?.('typewriter')}
          title="打字机模式 (当前行居中)"
          className={focusBtnCls(focusMode === 'typewriter')}
          style={{
            backgroundColor: focusMode === 'typewriter' ? 'var(--accent-bg)' : 'transparent',
            borderColor: focusMode === 'typewriter' ? 'var(--accent-color)' : 'transparent',
            color: focusMode === 'typewriter' ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (focusMode !== 'typewriter') {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (focusMode !== 'typewriter') {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Type size={14} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => onFocusModeChange?.('focus')}
          title="专注模式"
          className={focusBtnCls(focusMode === 'focus')}
          style={{
            backgroundColor: focusMode === 'focus' ? 'var(--accent-bg)' : 'transparent',
            borderColor: focusMode === 'focus' ? 'var(--accent-color)' : 'transparent',
            color: focusMode === 'focus' ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (focusMode !== 'focus') {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (focusMode !== 'focus') {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Monitor size={14} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => onFocusModeChange?.(focusMode === 'fullscreen' ? 'normal' : 'fullscreen')}
          title="全屏模式"
          className={focusBtnCls(focusMode === 'fullscreen')}
          style={{
            backgroundColor: focusMode === 'fullscreen' ? 'var(--accent-bg)' : 'transparent',
            borderColor: focusMode === 'fullscreen' ? 'var(--accent-color)' : 'transparent',
            color: focusMode === 'fullscreen' ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (focusMode !== 'fullscreen') {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={(e) => {
            if (focusMode !== 'fullscreen') {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {focusMode === 'fullscreen' ? <Minimize size={14} strokeWidth={1.8} /> : <Maximize size={14} strokeWidth={1.8} />}
        </button>
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
        <button
          onClick={() => onSetViewMode('edit')}
          title="仅编辑 (Ctrl+1)"
          className={viewBtnCls(viewMode === 'edit')}
          style={{
            backgroundColor: viewMode === 'edit' ? 'var(--bg-primary)' : 'transparent',
            borderColor: viewMode === 'edit' ? 'var(--border-color)' : 'transparent',
            color: viewMode === 'edit' ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'edit') {
              e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'edit') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <PanelRightClose size={15} strokeWidth={1.8} /><span>编辑</span>
        </button>
        <button
          onClick={() => onSetViewMode('split')}
          title="分栏视图 (Ctrl+2)"
          className={viewBtnCls(viewMode === 'split')}
          style={{
            backgroundColor: viewMode === 'split' ? 'var(--bg-primary)' : 'transparent',
            borderColor: viewMode === 'split' ? 'var(--border-color)' : 'transparent',
            color: viewMode === 'split' ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'split') {
              e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'split') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <Columns2 size={15} strokeWidth={1.8} /><span>分栏</span>
        </button>
        <button
          onClick={() => onSetViewMode('preview')}
          title="仅预览 (Ctrl+3)"
          className={viewBtnCls(viewMode === 'preview')}
          style={{
            backgroundColor: viewMode === 'preview' ? 'var(--bg-primary)' : 'transparent',
            borderColor: viewMode === 'preview' ? 'var(--border-color)' : 'transparent',
            color: viewMode === 'preview' ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'preview') {
              e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'preview') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <PanelLeftClose size={15} strokeWidth={1.8} /><span>预览</span>
        </button>
      </div>
    </div>
  );
}
