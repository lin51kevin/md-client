import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Save, SaveAll, FilePlus, PanelLeftClose, PanelRightClose, Columns2, FileText, Printer, FileCode, Type, Monitor, Maximize, Minimize, List, SpellCheck, Clock, Trash2 } from 'lucide-react';
import { ViewMode, FocusMode } from '../types';
import type { ThemeName } from '../lib/theme';
import { getRecentFiles, type RecentFile } from '../lib/recent-files';

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
  /** F013: 最近文件列表 */
  recentFiles?: RecentFile[];
  /** F013: 打开最近文件 */
  onOpenRecent?: (filePath: string) => void;
  /** F013: 清空最近文件 */
  onClearRecent?: () => void;
}

export function Toolbar({ viewMode, focusMode, showToc, currentTheme, onNewTab, onOpenFile, onSaveFile, onSaveAsFile, onExportDocx, onExportPdf, onExportHtml, onSetViewMode, onFocusModeChange, onToggleToc, onThemeChange, spellCheck, onToggleSpellCheck, recentFiles, onOpenRecent, onClearRecent }: ToolbarProps) {
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

  // F013: 最近文件下拉菜单状态
  const [showRecent, setShowRecent] = useState(false);
  const [localRecentFiles, setLocalRecentFiles] = useState<RecentFile[]>(recentFiles ?? []);
  const recentDropRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!showRecent) return;
    const handler = (e: MouseEvent) => {
      if (recentDropRef.current && !recentDropRef.current.contains(e.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showRecent]);

  return (
    <div className="shrink-0 flex items-center justify-between px-2 py-1" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="flex items-center">
        <button onClick={onNewTab} title="新建 (Ctrl+N)" className={btnCls}>
          <FilePlus size={15} strokeWidth={1.8} /><span>新建</span>
        </button>
        <button onClick={onOpenFile} title="打开文件 (Ctrl+O)" className={btnCls}>
          <FolderOpen size={15} strokeWidth={1.8} /><span>打开</span>
        </button>
        {/* F013: 最近文件下拉 */}
        <div className="relative" ref={recentDropRef}>
          <button
            onClick={() => {
              setLocalRecentFiles(getRecentFiles());
              setShowRecent(prev => !prev);
            }}
            title="最近文件"
            className={btnCls}
          >
            <Clock size={15} strokeWidth={1.8} /><span>最近</span>
          </button>
          {showRecent && (
            <div
              className="absolute left-0 top-full mt-1 z-50 shadow-xl rounded-lg py-1 text-xs"
              style={{ minWidth: 280, maxHeight: 320, overflowY: 'auto', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {localRecentFiles && localRecentFiles.length > 0 ? (
                <>
                  {localRecentFiles.map((file) => (
                    <button
                      key={file.path}
                      title={file.path}
                      className="w-full flex items-center gap-2 px-4 py-1.5 text-left transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-color)'; e.currentTarget.style.color = 'var(--bg-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseDown={() => { onOpenRecent?.(file.path); setShowRecent(false); }}
                    >
                      <FolderOpen size={13} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
                      <span className="truncate font-medium">{file.name}</span>
                    </button>
                  ))}
                  <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
                  <button
                    className="w-full flex items-center gap-2 px-4 py-1.5 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseDown={() => { onClearRecent?.(); setLocalRecentFiles([]); setShowRecent(false); }}
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                    <span>清空记录</span>
                  </button>
                </>
              ) : (
                <div className="px-4 py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={20} strokeWidth={1} className="mx-auto mb-1" />
                  <div>暂无最近文件</div>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onSaveFile} title="保存 (Ctrl+S)" className={btnCls}>
          <Save size={15} strokeWidth={1.8} /><span>保存</span>
        </button>
        <button onClick={onSaveAsFile} title="另存为… (Ctrl+Shift+S)" className={btnCls}>
          <SaveAll size={15} strokeWidth={1.8} /><span>另存为</span>
        </button>
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
        <button onClick={onExportDocx} title="导出为 Word 文档" className={btnCls}>
          <FileText size={15} strokeWidth={1.8} /><span>导出DOCX</span>
        </button>
        <button onClick={onExportPdf} title="导出为 PDF" className={btnCls}>
          <Printer size={15} strokeWidth={1.8} /><span>导出PDF</span>
        </button>
        <button onClick={onExportHtml} title="导出为 HTML" className={btnCls}>
          <FileCode size={15} strokeWidth={1.8} /><span>导出HTML</span>
        </button>
      </div>
      <div className="flex items-center gap-0.5">
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
