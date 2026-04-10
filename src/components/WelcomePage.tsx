import { FilePlus, FolderOpen, Clock, Keyboard } from 'lucide-react';
import { useI18n } from '../i18n';
import type { RecentFile } from '../lib/recent-files';

interface WelcomePageProps {
  recentFiles: RecentFile[];
  onNew: () => void;
  onOpenFile: () => void;
  onOpenRecent: (filePath: string) => void;
}

/** Shortcuts displayed in the welcome page */
const SHORTCUTS = [
  { key: 'Ctrl+N', i18nKey: 'welcome.shortcut.new' as const },
  { key: 'Ctrl+O', i18nKey: 'welcome.shortcut.open' as const },
  { key: 'Ctrl+S', i18nKey: 'welcome.shortcut.save' as const },
  { key: 'Ctrl+F', i18nKey: 'welcome.shortcut.find' as const },
  { key: 'Ctrl+Shift+V', i18nKey: 'welcome.shortcut.preview' as const },
  { key: 'Ctrl+Shift+E', i18nKey: 'welcome.shortcut.edit' as const },
  { key: 'Ctrl+Shift+S', i18nKey: 'welcome.shortcut.split' as const },
] as const;

export function WelcomePage({ recentFiles, onNew, onOpenFile, onOpenRecent }: WelcomePageProps) {
  const { t } = useI18n();

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-2xl mx-auto px-8 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            MarkLite
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-4 mb-10">
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
          >
            <FilePlus size={16} strokeWidth={1.8} />
            {t('welcome.newFile')}
          </button>
          <button
            onClick={onOpenFile}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
          >
            <FolderOpen size={16} strokeWidth={1.8} />
            {t('welcome.openFile')}
          </button>
        </div>

        {/* Recent Files + Shortcuts grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Files */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
              <Clock size={15} strokeWidth={1.8} />
              <span className="text-sm font-semibold">{t('welcome.recentFiles')}</span>
            </div>
            {recentFiles.length > 0 ? (
              <ul className="space-y-1">
                {recentFiles.map((file) => (
                  <li key={file.path}>
                    <button
                      onClick={() => onOpenRecent(file.path)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors group"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                      title={file.path}
                    >
                      {file.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm px-1" style={{ color: 'var(--text-tertiary)' }}>
                {t('welcome.noRecentFiles')}
              </p>
            )}
          </div>

          {/* Keyboard Shortcuts */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
              <Keyboard size={15} strokeWidth={1.8} />
              <span className="text-sm font-semibold">{t('welcome.shortcuts')}</span>
            </div>
            <ul className="space-y-1.5">
              {SHORTCUTS.map((sc) => (
                <li key={sc.key} className="flex items-center justify-between px-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t(sc.i18nKey)}
                  </span>
                  <kbd
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {sc.key}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
