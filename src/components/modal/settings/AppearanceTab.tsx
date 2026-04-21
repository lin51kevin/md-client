import type { RefObject } from 'react';
import { Download, FolderInput, Trash2 } from 'lucide-react';
import { useI18n } from '../../../i18n';
import type { ThemeName, ThemeConfig } from '../../../lib/theme';
import { CustomCssEditor } from '../../file/CustomCssEditor';
import { SettingItem } from './shared';

interface AppearanceTabProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  installedThemes: ThemeConfig[];
  themeImportError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportThemeExample: () => void;
  onRemoveTheme: (name: string) => void;
  isBuiltIn: (name: string) => boolean;
}

export function AppearanceTab({
  currentTheme,
  onThemeChange,
  installedThemes,
  themeImportError,
  fileInputRef,
  onFileSelect,
  onExportThemeExample,
  onRemoveTheme,
  isBuiltIn,
}: AppearanceTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <SettingItem
        label={t('settings.appearance.theme')}
        description={t('settings.appearance.themeDesc')}
      >
        <select
          value={currentTheme}
          onChange={(e) => onThemeChange(e.target.value as ThemeName)}
          className="text-xs px-2 py-1 rounded outline-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          {installedThemes.map((cfg) => (
            <option key={cfg.name} value={cfg.name}>{cfg.label}</option>
          ))}
        </select>
      </SettingItem>

      {/* Custom theme management */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('settings.appearance.customThemes')}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onExportThemeExample}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
              title={t('settings.appearance.exportThemeExample')}
            >
              <Download size={11} />
              {t('settings.appearance.exportThemeExample')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{
                backgroundColor: 'var(--accent-bg)',
                color: 'var(--accent-color)',
                border: '1px solid var(--accent-color)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-color)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-bg)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
            >
              <FolderInput size={11} />
              {t('settings.appearance.importTheme')}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onFileSelect}
          />
        </div>

        {themeImportError && (
          <div
            className="text-xs px-2 py-1.5 rounded mt-2"
            style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-color)' }}
          >
            {t('settings.appearance.importThemeError')}: {themeImportError}
          </div>
        )}

        {installedThemes.filter((cfg) => !isBuiltIn(cfg.name)).length > 0 && (
          <div className="space-y-1 mt-2">
            {installedThemes.filter((cfg) => !isBuiltIn(cfg.name)).map((cfg) => (
              <div
                key={cfg.name}
                className="flex items-center justify-between px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <span style={{ color: 'var(--text-primary)' }}>{cfg.label}</span>
                <button
                  onClick={() => onRemoveTheme(cfg.name)}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                  title={t('settings.appearance.removeTheme')}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom CSS */}
      <div>
        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          {t('settings.appearance.customCss')}
        </div>
        <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          {t('settings.appearance.customCssDesc')}
        </div>
        <CustomCssEditor />
      </div>
    </div>
  );
}
