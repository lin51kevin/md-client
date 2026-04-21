import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Settings, Palette, Type, FolderOpen, Keyboard, FileText, Eye } from 'lucide-react';
import { useI18n } from '../../i18n';
import { toErrorMessage } from '../../lib/utils/errors';
import type { TranslationKey } from '../../i18n/zh-CN';
import type { ThemeName } from '../../lib/theme';
import { getInstalledThemes, loadThemeFromJson, installTheme, removeTheme, isBuiltInTheme, exportThemeAsJson } from '../../lib/theme/manager';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { SnippetManager } from './SnippetManager';
import { GeneralTab } from './settings/GeneralTab';
import { EditorTab } from './settings/EditorTab';
import { PreviewTab } from './settings/PreviewTab';
import { AppearanceTab } from './settings/AppearanceTab';
import { FilesTab } from './settings/FilesTab';
import { ShortcutsTab } from './settings/ShortcutsTab';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  spellCheck: boolean;
  onSpellCheckChange: (enabled: boolean) => void;
  vimMode: boolean;
  onVimModeChange: (enabled: boolean) => void;
  autoSave: boolean;
  onAutoSaveChange: (enabled: boolean) => void;
  autoSaveDelay: number;
  onAutoSaveDelayChange: (delay: number) => void;
  gitMdOnly: boolean;
  onGitMdOnlyChange: (enabled: boolean) => void;
  milkdownPreview: boolean;
  onMilkdownPreviewChange: (enabled: boolean) => void;
  mermaidTheme: string;
  onMermaidThemeChange: (theme: string) => void;
  fileWatch: boolean;
  onFileWatchChange: (enabled: boolean) => void;
  fileWatchBehavior: boolean;
  onFileWatchBehaviorChange: (autoReload: boolean) => void;
  autoUpdateCheck?: boolean;
  onAutoUpdateCheckChange?: (enabled: boolean) => void;
  updateCheckFrequency?: 'startup' | '24h';
  onUpdateCheckFrequencyChange?: (freq: 'startup' | '24h') => void;
  contextMenuIntegration?: boolean;
  onContextMenuIntegrationChange?: (enabled: boolean) => void;
  typewriterOptions?: import('../../hooks/useTypewriterOptions').TypewriterOptions;
  onTypewriterOptionsChange?: (update: Partial<import('../../hooks/useTypewriterOptions').TypewriterOptions>) => void;
}

type TabId = 'general' | 'editor' | 'preview' | 'appearance' | 'files' | 'shortcuts' | 'snippets';

const TABS: { id: TabId; icon: React.ReactNode; labelKey: TranslationKey }[] = [
  { id: 'general', icon: <Settings size={14} />, labelKey: 'settings.tabs.general' },
  { id: 'editor', icon: <Type size={14} />, labelKey: 'settings.tabs.editor' },
  { id: 'preview', icon: <Eye size={14} />, labelKey: 'settings.tabs.preview' },
  { id: 'appearance', icon: <Palette size={14} />, labelKey: 'settings.tabs.appearance' },
  { id: 'files', icon: <FolderOpen size={14} />, labelKey: 'settings.tabs.files' },
  { id: 'shortcuts', icon: <Keyboard size={14} />, labelKey: 'settings.tabs.shortcuts' },
  { id: 'snippets', icon: <FileText size={14} />, labelKey: 'snippet.manager' },
];

export function SettingsModal({
  visible,
  onClose,
  currentTheme,
  onThemeChange,
  spellCheck: _spellCheck,
  onSpellCheckChange: _onSpellCheckChange,
  vimMode: _vimMode,
  onVimModeChange: _onVimModeChange,
  autoSave,
  onAutoSaveChange,
  autoSaveDelay,
  onAutoSaveDelayChange,
  gitMdOnly,
  onGitMdOnlyChange,
  milkdownPreview,
  onMilkdownPreviewChange,
  mermaidTheme,
  onMermaidThemeChange,
  fileWatch,
  onFileWatchChange,
  fileWatchBehavior,
  onFileWatchBehaviorChange,
  autoUpdateCheck = true,
  onAutoUpdateCheckChange,
  updateCheckFrequency = '24h',
  onUpdateCheckFrequencyChange,
  contextMenuIntegration = false,
  onContextMenuIntegrationChange,
  typewriterOptions,
  onTypewriterOptionsChange,
}: SettingsModalProps) {
  const { t, locale, setLocale } = useI18n();
  const isWindows = navigator.platform?.toLowerCase().includes('win') || navigator.userAgent.includes('Windows');
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [installedThemes, setInstalledThemes] = useState(() => getInstalledThemes());
  const [themeImportError, setThemeImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshThemes = useCallback(() => {
    setInstalledThemes(getInstalledThemes());
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const json = await file.text();
      const theme = await loadThemeFromJson(json);
      installTheme(theme);
      refreshThemes();
      onThemeChange(theme.name as ThemeName);
      setThemeImportError(null);
    } catch (err) {
      setThemeImportError(toErrorMessage(err));
    }
  }, [onThemeChange, refreshThemes]);

  const handleRemoveTheme = useCallback((name: string) => {
    removeTheme(name);
    refreshThemes();
    if (currentTheme === name) onThemeChange('light' as ThemeName);
  }, [currentTheme, onThemeChange, refreshThemes]);

  const handleExportThemeExample = useCallback(async () => {
    const theme = installedThemes.find(t => t.name === currentTheme);
    if (!theme) return;
    const json = exportThemeAsJson(theme);
    try {
      const savePath = await save({
        defaultPath: `${currentTheme}-custom.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (savePath) {
        await invoke('write_file_text', { path: savePath, content: json });
      }
    } catch {
      // user cancelled
    }
  }, [currentTheme, installedThemes]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[10000]"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl flex overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          width: 600,
          height: 400,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div
          className="w-40 shrink-0 py-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
          }}
        >
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('settings.title')}
            </span>
          </div>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--accent-bg)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab.icon}
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t(TABS.find((t) => t.id === activeTab)?.labelKey ?? 'settings.title')}
            </span>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-6 h-6 rounded"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'general' && (
              <GeneralTab
                locale={locale}
                setLocale={setLocale}
                autoUpdateCheck={autoUpdateCheck}
                onAutoUpdateCheckChange={onAutoUpdateCheckChange ?? (() => {})}
                updateCheckFrequency={updateCheckFrequency}
                onUpdateCheckFrequencyChange={onUpdateCheckFrequencyChange ?? (() => {})}
                contextMenuIntegration={contextMenuIntegration}
                onContextMenuIntegrationChange={onContextMenuIntegrationChange ?? (() => {})}
                isWindows={isWindows}
              />
            )}

            {activeTab === 'editor' && (
              <EditorTab
                autoSave={autoSave}
                onAutoSaveChange={onAutoSaveChange}
                autoSaveDelay={autoSaveDelay}
                onAutoSaveDelayChange={onAutoSaveDelayChange}
                fileWatch={fileWatch}
                onFileWatchChange={onFileWatchChange}
                fileWatchBehavior={fileWatchBehavior}
                onFileWatchBehaviorChange={onFileWatchBehaviorChange}
                typewriterOptions={typewriterOptions}
                onTypewriterOptionsChange={onTypewriterOptionsChange}
              />
            )}

            {activeTab === 'preview' && (
              <PreviewTab
                milkdownPreview={milkdownPreview}
                onMilkdownPreviewChange={onMilkdownPreviewChange}
                mermaidTheme={mermaidTheme}
                onMermaidThemeChange={onMermaidThemeChange}
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceTab
                currentTheme={currentTheme}
                onThemeChange={onThemeChange}
                installedThemes={installedThemes}
                themeImportError={themeImportError}
                fileInputRef={fileInputRef}
                onFileSelect={handleFileSelect}
                onExportThemeExample={handleExportThemeExample}
                onRemoveTheme={handleRemoveTheme}
                isBuiltIn={isBuiltInTheme}
              />
            )}

            {activeTab === 'files' && (
              <FilesTab
                gitMdOnly={gitMdOnly}
                onGitMdOnlyChange={onGitMdOnlyChange}
              />
            )}

            {activeTab === 'shortcuts' && <ShortcutsTab />}

            {activeTab === 'snippets' && (
              <SnippetManager visible={true} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
