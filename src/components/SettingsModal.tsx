import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Settings, Palette, Type, FolderOpen, Keyboard, RotateCcw, FileText, FolderInput, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n, type Locale } from '../i18n';
import type { TranslationKey } from '../i18n/zh-CN';
import type { ThemeName } from '../lib/theme';
import { getInstalledThemes, loadThemeFromJson, installTheme, removeTheme, isBuiltInTheme } from '../lib/theme-manager';
import { CustomCssEditor } from './CustomCssEditor';
import { getImageSaveDir, setImageSaveDir } from '../lib/image-paste';
import {
  DEFAULT_SHORTCUTS,
  getCustomShortcuts,
  setCustomShortcuts,
  formatKeyEvent,
} from '../lib/shortcuts-config';
import { SnippetManager } from './SnippetManager';

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
  fileWatch: boolean;
  onFileWatchChange: (enabled: boolean) => void;
  fileWatchBehavior: boolean;
  onFileWatchBehaviorChange: (autoReload: boolean) => void;
  autoUpdateCheck?: boolean;
  onAutoUpdateCheckChange?: (enabled: boolean) => void;
  updateCheckFrequency?: 'startup' | '24h';
  onUpdateCheckFrequencyChange?: (freq: 'startup' | '24h') => void;
}

type TabId = 'general' | 'editor' | 'appearance' | 'files' | 'shortcuts' | 'snippets';

const TABS: { id: TabId; icon: React.ReactNode; labelKey: TranslationKey }[] = [
  { id: 'general', icon: <Settings size={14} />, labelKey: 'settings.tabs.general' },
  { id: 'editor', icon: <Type size={14} />, labelKey: 'settings.tabs.editor' },
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
  spellCheck,
  onSpellCheckChange,
  vimMode,
  onVimModeChange,
  autoSave,
  onAutoSaveChange,
  autoSaveDelay,
  onAutoSaveDelayChange,
  gitMdOnly,
  onGitMdOnlyChange,
  milkdownPreview,
  onMilkdownPreviewChange,
  fileWatch,
  onFileWatchChange,
  fileWatchBehavior,
  onFileWatchBehaviorChange,
  autoUpdateCheck = true,
  onAutoUpdateCheckChange,
  updateCheckFrequency = '24h',
  onUpdateCheckFrequencyChange,
}: SettingsModalProps) {
  const { t, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [imageDir, setImageDir] = useState(getImageSaveDir);
  const [installedThemes, setInstalledThemes] = useState(() => getInstalledThemes());
  const [themeImportError, setThemeImportError] = useState<string | null>(null);
  const [showThemeFormat, setShowThemeFormat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const PRESET_DELAYS = [1000, 2000, 5000];
  const [isCustomDelay, setIsCustomDelay] = useState(!PRESET_DELAYS.includes(autoSaveDelay));
  const [customDelayMs, setCustomDelayMs] = useState<string>(String(autoSaveDelay));

  // Sync custom delay input when prop changes externally
  useEffect(() => {
    if (!PRESET_DELAYS.includes(autoSaveDelay)) {
      setIsCustomDelay(true);
      setCustomDelayMs(String(autoSaveDelay));
    } else {
      setIsCustomDelay(false);
    }
  }, [autoSaveDelay]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setThemeImportError(err instanceof Error ? err.message : String(err));
    }
  }, [onThemeChange, refreshThemes]);

  const handleRemoveTheme = useCallback((name: string) => {
    removeTheme(name);
    refreshThemes();
    if (currentTheme === name) onThemeChange('light' as ThemeName);
  }, [currentTheme, onThemeChange, refreshThemes]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  const handleImageDirChange = useCallback((dir: string) => {
    setImageDir(dir);
    setImageSaveDir(dir);
  }, []);

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
              <div className="space-y-4">
                <SettingItem
                  label={t('update.autoCheck')}
                  description={t('update.autoCheckDesc')}
                >
                  <ToggleSwitch checked={autoUpdateCheck} onChange={onAutoUpdateCheckChange ?? (() => {})} />
                </SettingItem>

                {autoUpdateCheck && (
                  <SettingItem
                    label={t('update.checkFrequency')}
                    description={t('update.checkFrequencyDesc')}
                  >
                    <select
                      value={updateCheckFrequency}
                      onChange={(e) => onUpdateCheckFrequencyChange?.(e.target.value as 'startup' | '24h')}
                      className="text-xs px-2 py-1 rounded outline-none"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="startup">{t('update.frequencyStartup')}</option>
                      <option value="24h">{t('update.frequency24h')}</option>
                    </select>
                  </SettingItem>
                )}

                <SettingItem
                  label={t('settings.general.language')}
                  description={t('settings.general.languageDesc')}
                >
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                    className="text-xs px-2 py-1 rounded outline-none"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en">English</option>
                  </select>
                </SettingItem>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-4">
                <SettingItem
                  label={t('settings.editor.spellCheck')}
                  description={t('settings.editor.spellCheckDesc')}
                >
                  <ToggleSwitch checked={spellCheck} onChange={onSpellCheckChange} />
                </SettingItem>

                <SettingItem
                  label={t('settings.editor.vimMode')}
                  description={t('settings.editor.vimModeDesc')}
                >
                  <ToggleSwitch checked={vimMode} onChange={onVimModeChange} />
                </SettingItem>

                <SettingItem
                  label={t('settings.editor.autoSave')}
                  description={t('settings.editor.autoSaveDesc')}
                >
                  <ToggleSwitch checked={autoSave} onChange={onAutoSaveChange} />
                </SettingItem>

                {autoSave && (
                  <SettingItem
                    label={t('settings.editor.autoSaveDelay')}
                    description={t('settings.editor.autoSaveDelayDesc')}
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={isCustomDelay ? 'custom' : String(autoSaveDelay)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setIsCustomDelay(true);
                          } else {
                            setIsCustomDelay(false);
                            onAutoSaveDelayChange(Number(val));
                          }
                        }}
                        className="text-xs px-2 py-1 rounded outline-none"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="1000">1s</option>
                        <option value="2000">2s</option>
                        <option value="5000">5s</option>
                        <option value="custom">{t('settings.editor.delayCustom')}</option>
                      </select>
                      {isCustomDelay && (
                        <input
                          type="number"
                          min="100"
                          max="60000"
                          value={customDelayMs}
                          onChange={(e) => setCustomDelayMs(e.target.value)}
                          onBlur={(e) => {
                            const ms = parseInt(e.target.value, 10);
                            if (!isNaN(ms) && ms >= 100) {
                              onAutoSaveDelayChange(ms);
                            } else {
                              setCustomDelayMs(String(autoSaveDelay));
                            }
                          }}
                          className="text-xs px-2 py-1 rounded outline-none w-20"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      )}
                    </div>
                  </SettingItem>
                )}

                <SettingItem
                  label={t('settings.editor.milkdownPreview')}
                  description={t('settings.editor.milkdownPreviewDesc')}
                >
                  <ToggleSwitch checked={milkdownPreview} onChange={onMilkdownPreviewChange} />
                </SettingItem>

                <SettingItem
                  label={t('settings.editor.fileWatch')}
                  description={t('settings.editor.fileWatchDesc')}
                >
                  <ToggleSwitch checked={fileWatch} onChange={onFileWatchChange} />
                </SettingItem>

                {fileWatch && (
                  <SettingItem
                    label={t('settings.editor.fileWatchBehavior')}
                    description={t('settings.editor.fileWatchBehaviorDesc')}
                  >
                    <select
                      value={fileWatchBehavior ? 'auto' : 'ask'}
                      onChange={(e) => onFileWatchBehaviorChange(e.target.value === 'auto')}
                      className="text-xs px-2 py-1 rounded outline-none"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="ask">{t('settings.editor.fileWatchAlwaysAsk')}</option>
                      <option value="auto">{t('settings.editor.fileWatchAutoReload')}</option>
                    </select>
                  </SettingItem>
                )}
              </div>
            )}

            {activeTab === 'appearance' && (
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
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t('settings.appearance.customThemes')}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {t('settings.appearance.customThemesDesc')}
                      </div>
                    </div>
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {themeImportError && (
                    <div
                      className="text-xs px-2 py-1.5 rounded mb-2"
                      style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-color)' }}
                    >
                      {t('settings.appearance.importThemeError')}: {themeImportError}
                    </div>
                  )}

                  {installedThemes.filter(cfg => !isBuiltInTheme(cfg.name)).length === 0 ? (
                    <div
                      className="text-xs px-3 py-2 rounded text-center"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
                    >
                      {t('settings.appearance.noCustomThemes')}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {installedThemes.filter(cfg => !isBuiltInTheme(cfg.name)).map(cfg => (
                        <div
                          key={cfg.name}
                          className="flex items-center justify-between px-3 py-1.5 rounded text-xs"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <span style={{ color: 'var(--text-primary)' }}>{cfg.label}</span>
                          <button
                            onClick={() => handleRemoveTheme(cfg.name)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
                            style={{ color: 'var(--text-tertiary)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            title={t('settings.appearance.removeTheme')}
                          >
                            <Trash2 size={11} />
                            {t('settings.appearance.removeTheme')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* JSON format reference */}
                  <div className="mt-3">
                    <button
                      onClick={() => setShowThemeFormat(v => !v)}
                      className="flex items-center gap-1 text-[10px] transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    >
                      {showThemeFormat ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      {t('settings.appearance.themeFormatHint')}
                    </button>
                    {showThemeFormat && (
                      <pre
                        className="mt-1.5 text-[9px] rounded p-2 overflow-x-auto leading-relaxed"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          fontFamily: 'monospace',
                        }}
                      >{`{
  "name": "my-theme",
  "label": "🎨 我的主题",
  "isDark": false,
  "cmTheme": "light",
  "cssVars": {
    "--bg-primary":    "#ffffff",
    "--bg-secondary":  "#f6f8fa",
    "--bg-tertiary":   "#eaecef",
    "--text-primary":  "#1f2328",
    "--text-secondary":"#656d76",
    "--text-tertiary": "#9ca3af",
    "--border-color":  "#d0d7de",
    "--accent-color":  "#0969da",
    "--accent-hover":  "#0550ae",
    "--accent-bg":     "#ddf4ff",
    "--hover-bg":      "#f3f4f6",
    "--hover-overlay": "rgba(0,0,0,0.05)",
    "--warning-color": "#f59e0b",
    "--warning-bg":    "#fef3c7"
  }
}`}</pre>
                    )}
                  </div>
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
            )}

            {activeTab === 'files' && (
              <div className="space-y-4">
                <SettingItem
                  label={t('settings.files.imageDir')}
                  description={t('settings.files.imageDirDesc')}
                >
                  <input
                    type="text"
                    value={imageDir}
                    onChange={(e) => handleImageDirChange(e.target.value)}
                    placeholder={t('settings.files.imageDirPlaceholder')}
                    className="w-full text-xs px-2 py-1 rounded outline-none mt-1"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </SettingItem>

                <SettingItem
                  label={t('settings.files.gitMdOnly')}
                  description={t('settings.files.gitMdOnlyDesc')}
                >
                  <ToggleSwitch checked={gitMdOnly} onChange={onGitMdOnlyChange} />
                </SettingItem>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-2">
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {t('settings.shortcuts.description')}
                </p>
                <EditableShortcuts />
              </div>
            )}

            {activeTab === 'snippets' && (
              <SnippetManager visible={true} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingItem({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{
        backgroundColor: checked ? 'var(--accent-color)' : 'var(--bg-tertiary)',
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
        style={{
          transform: checked ? 'translateX(18px)' : 'translateX(3px)',
        }}
      />
    </button>
  );
}

/** 可编辑快捷键列表组件 */
function EditableShortcuts() {
  const { t } = useI18n();
  const [custom, setCustom] = useState<Record<string, string>>(() => getCustomShortcuts());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempKeys, setTempKeys] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听键盘事件捕获新快捷键
  useEffect(() => {
    if (!editingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setEditingId(null); setTempKeys('');
        return;
      }
      const formatted = formatKeyEvent(e);
      if (formatted) {
        setTempKeys(formatted);
        // 松开按键后保存
        setEditingId(null);
        const newCustom = { ...custom, [editingId]: formatted };
        setCustom(newCustom);
        setCustomShortcuts(newCustom);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingId, custom]);

  const resetToDefault = useCallback((id: string) => {
    const newCustom = { ...custom };
    delete newCustom[id];
    setCustom(newCustom);
    setCustomShortcuts(newCustom);
  }, [custom]);

  return (
    <div ref={containerRef} className="space-y-1">
      {DEFAULT_SHORTCUTS.map((sc) => {
        const currentKeys = custom[sc.id] || sc.defaultKeys;
        const isEditing = editingId === sc.id;
        const isCustom = !!custom[sc.id];

        return (
          <div
            key={sc.id}
            className="flex items-center justify-between px-3 py-2 rounded text-xs group"
            style={{
              backgroundColor: isEditing ? 'var(--accent-bg)' : 'var(--bg-secondary)',
              border: isEditing ? '1px solid var(--accent-color)' : 'none',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>{t(sc.labelKey)}</span>
            <div className="flex items-center gap-2">
              <kbd
                onClick={() => !isEditing && setEditingId(sc.id)}
                className="px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer transition-colors hover:opacity-80"
                style={{
                  backgroundColor: isEditing ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: isEditing ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {isEditing && tempKeys ? tempKeys : currentKeys}
              </kbd>
              {isCustom && (
                <button
                  onClick={() => resetToDefault(sc.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20"
                  title="恢复默认"
                >
                  <RotateCcw size={10} style={{ color: 'var(--text-secondary)' }} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {editingId && (
        <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
          按下新的快捷键组合，或 ESC 取消
        </p>
      )}
    </div>
  );
}
