import { useState, useEffect, type ReactNode } from 'react';
import { FilePlus, FolderOpen, FileText, Clock, Keyboard, X, Hash } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n';
import type { RecentFile } from '../../lib/file';
import logoUrl from '../../../src-tauri/icons/128x128.png';

const MAX_VISIBLE_RECENT = 5;

/** Full shortcut list shown on the welcome page right column */
const SHORTCUTS = [
  { key: 'Ctrl+N', i18nKey: 'welcome.shortcut.new' as const },
  { key: 'Ctrl+O', i18nKey: 'welcome.shortcut.open' as const },
  { key: 'Ctrl+S', i18nKey: 'welcome.shortcut.save' as const },
  { key: 'Ctrl+F', i18nKey: 'welcome.shortcut.find' as const },
  { key: 'Ctrl+1', i18nKey: 'welcome.shortcut.edit' as const },
  { key: 'Ctrl+2', i18nKey: 'welcome.shortcut.split' as const },
  { key: 'Ctrl+3', i18nKey: 'welcome.shortcut.preview' as const },
] as const;

/** Condensed shortcuts shown in the empty editor overlay */
const EMPTY_SHORTCUTS = [
  { key: 'Ctrl+N', i18nKey: 'welcome.shortcut.new' as const },
  { key: 'Ctrl+O', i18nKey: 'welcome.shortcut.open' as const },
  { key: 'Ctrl+S', i18nKey: 'welcome.shortcut.save' as const },
  { key: 'Ctrl+F', i18nKey: 'welcome.shortcut.find' as const },
  { key: 'Ctrl+1', i18nKey: 'welcome.shortcut.edit' as const },
  { key: 'Ctrl+2', i18nKey: 'welcome.shortcut.split' as const },
  { key: 'Ctrl+3', i18nKey: 'welcome.shortcut.preview' as const },
] as const;

interface WelcomePageProps {
  recentFiles: RecentFile[];
  onNew: () => void;
  onOpenFile: () => void;
  onOpenFolder?: () => void;
  onOpenRecent: (filePath: string) => void;
  /** Creates a new tab with pre-filled content */
  onNewWithContent?: (content: string, displayName?: string) => void;
  /** Opens the sample document in an editable tab */
  onOpenSample?: () => void;
  /** When provided, renders a dismiss (×) button in the top-right corner */
  onDismiss?: () => void;
}

export interface EmptyEditorStateProps {
  /** Clicking the link re-opens the welcome page */
  onShowWelcome?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return an abbreviated parent-directory path for display next to the filename */
function getParentDir(filePath: string): string {
  const normalised = filePath.replace(/\\/g, '/');
  const lastSlash = normalised.lastIndexOf('/');
  if (lastSlash <= 0) return '';
  const parent = normalised.slice(0, lastSlash);
  const parts = parent.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (parts.length <= 2) return parent;
  return '.../' + parts.slice(-2).join('/');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ActionLink({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 py-2 rounded text-sm"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
        e.currentTarget.style.color = 'var(--accent-color)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyEditorState – shown after the welcome page is dismissed
// Mirrors VS Code's empty editor keyboard-hint overlay
// ─────────────────────────────────────────────────────────────────────────────

export function EmptyEditorState({ onShowWelcome }: EmptyEditorStateProps) {
  const { t } = useI18n();
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* App logo — sized ~like VS Code's watermark */}
      <img
        src={logoUrl}
        alt="MarkLite"
        width={160}
        height={160}
        className="mb-8 select-none"
        style={{ opacity: 0.18 }}
        draggable={false}
      />
      <div className="w-72 space-y-3">
        {EMPTY_SHORTCUTS.map((sc) => (
          <div key={sc.key} className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t(sc.i18nKey)}
            </span>
            <kbd
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.02em',
              }}
            >
              {sc.key}
            </kbd>
          </div>
        ))}
      </div>

      {onShowWelcome && (
        <button
          onClick={onShowWelcome}
          className="mt-8 text-xs"
          style={{ color: 'var(--accent-color)' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = '')}
        >
          {t('welcome.showWelcome')}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WelcomePage – VS Code-inspired three-column layout
// ─────────────────────────────────────────────────────────────────────────────

const MEETING_TEMPLATE = `# 会议纪要

**日期：** ${new Date().toLocaleDateString('zh-CN')}
**地点：** 
**参会人员：** 
**记录人：** 

---

## 议题

### 1. 

### 2. 

## 决议

- 

## 待办事项

| 事项 | 负责人 | 截止日期 |
|------|--------|----------|
|      |        |          |

## 下次会议

**时间：** 
`;

const WEEKLY_TEMPLATE = `# 周报

**姓名：** 
**日期：** ${new Date().toLocaleDateString('zh-CN')}
**部门：** 

---

## 本周工作

### 1. 
- 进展：
- 状态：进行中 / 已完成

### 2. 
- 进展：
- 状态：进行中 / 已完成

## 遇到的问题

- 

## 下周计划

### 1. 

### 2. 

## 备注

- 
`;

const QUICK_TEMPLATES = [
  { label: '空白文档', icon: <FilePlus size={16} strokeWidth={1.8} />, action: 'blank' as const, desc: '从零开始' },
  { label: '会议纪要', icon: <FileText size={16} strokeWidth={1.8} />, action: 'meeting' as const, desc: '预填充会议模板' },
  { label: '周报', icon: <FileText size={16} strokeWidth={1.8} />, action: 'weekly' as const, desc: '预填充周报模板' },
];

export function WelcomePage({ recentFiles, onNew, onOpenFile, onOpenFolder, onOpenRecent, onNewWithContent, onOpenSample, onDismiss }: WelcomePageProps) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  useEffect(() => {
    if (!isTauri) return;
    recentFiles.forEach(file => {
      invoke<string>('read_file_text', { path: file.path })
        .then(text => setPreviews(prev => ({ ...prev, [file.path]: text.split('\n').slice(0, 3).join(' ').slice(0, 100) })))
        .catch(() => {});
    });
  }, [recentFiles]);
  const visibleRecent = showAll ? recentFiles : recentFiles.slice(0, MAX_VISIBLE_RECENT);
  const hasMore = !showAll && recentFiles.length > MAX_VISIBLE_RECENT;

  return (
    <div
      className="flex-1 flex flex-col overflow-auto"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Dismiss button – top-right */}
      {onDismiss && (
        <div className="flex justify-end px-4 pt-3 shrink-0">
          <button
            onClick={onDismiss}
            title={t('welcome.dismiss')}
            className="p-1.5 rounded"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-5xl mx-auto px-12 py-10">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="mb-14" style={{ textAlign: 'center' }}>
            <h1
              className="font-light tracking-tight mb-2"
              style={{ color: 'var(--text-primary)', fontSize: '4rem' }}
            >
              MarkLite
            </h1>
            <p className="text-base" style={{ color: 'var(--text-tertiary)', fontSize: '1.25rem' }}>
              {t('welcome.subtitle')}
            </p>
          </div>

          {/* Two-column layout */}
          <div className="grid" style={{ gridTemplateColumns: '6fr 4fr', gap: '3rem' }}>

            {/* Left column */}
            <div style={{ minWidth: 0 }}>
              {/* Top row: Start + Shortcuts side by side */}
              <div className="grid mb-8" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Start */}
                <section style={{ minWidth: 0 }}>
                  <h2
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('welcome.start')}
                  </h2>
                  <div className="space-y-px">
                    <ActionLink
                      icon={<FilePlus size={14} strokeWidth={1.8} />}
                      label={t('welcome.newFile')}
                      onClick={onNew}
                    />
                    <ActionLink
                      icon={<FileText size={14} strokeWidth={1.8} />}
                      label={t('welcome.openFile')}
                      onClick={onOpenFile}
                    />
                    {onOpenFolder && (
                      <ActionLink
                        icon={<FolderOpen size={14} strokeWidth={1.8} />}
                        label={t('welcome.openFolder')}
                        onClick={onOpenFolder}
                      />
                    )}
                    {onOpenSample && (
                      <ActionLink
                        icon={<Hash size={14} strokeWidth={1.8} />}
                        label={t('welcome.sample')}
                        onClick={onOpenSample}
                      />
                    )}
                  </div>
                </section>

                {/* Keyboard Shortcuts */}
                <section style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Keyboard size={11} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                    <h2
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {t('welcome.shortcuts')}
                    </h2>
                  </div>

                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: '1px solid var(--border-color)' }}
                  >
                    {SHORTCUTS.map((sc, idx) => (
                      <div
                        key={sc.key}
                        className="flex items-center justify-between px-3 py-2"
                        style={{
                          borderTop: idx > 0 ? '1px solid var(--border-color)' : undefined,
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                        }}
                      >
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {t(sc.i18nKey)}
                        </span>
                        <kbd
                          className="text-xs px-1.5 py-0.5 rounded font-mono"
                          style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Bottom row: Quick Templates */}
              <section>
                <h2
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('welcome.templates')}
                </h2>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {QUICK_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.action}
                      onClick={() => {
                        if (tmpl.action === 'blank') {
                          onNew();
                        } else if (tmpl.action === 'meeting' && onNewWithContent) {
                          onNewWithContent(MEETING_TEMPLATE, '会议纪要');
                        } else if (tmpl.action === 'weekly' && onNewWithContent) {
                          onNewWithContent(WEEKLY_TEMPLATE, '周报');
                        }
                      }}
                      className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.color = 'var(--accent-color)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      {tmpl.icon}
                      <span className="text-sm font-medium">{tmpl.label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{tmpl.desc}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Right column - Recent Files */}
            <section style={{ minWidth: 0 }}>
              <div className="flex items-center gap-1.5 mb-3">
                <Clock size={11} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                <h2
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('welcome.recentFiles')}
                </h2>
              </div>

              {recentFiles.length > 0 ? (
                <ul className="space-y-px">
                  {visibleRecent.map((file) => (
                    <li key={file.path}>
                      <button
                        onClick={() => onOpenRecent(file.path)}
                        className="w-full text-left px-2 py-1.5 rounded"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                        title={file.path}
                      >
                        <div className="text-sm truncate">{file.name}</div>
                        <div
                          className="text-xs truncate mt-0.5"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {getParentDir(file.path)}
                        </div>
                        {previews[file.path] && (
                          <div
                            className="text-xs truncate mt-0.5 italic"
                            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
                          >
                            {previews[file.path]}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                  {hasMore && (
                    <li>
                      <button
                        onClick={() => setShowAll(true)}
                        className="text-xs px-2 py-1.5"
                        style={{ color: 'var(--accent-color)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = '')}
                      >
                        {t('welcome.moreFiles')}
                      </button>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm px-2" style={{ color: 'var(--text-tertiary)' }}>
                  {t('welcome.noRecentFiles')}
                </p>
              )}
            </section>

          </div>

        </div>
      </div>
    </div>
  );
}
