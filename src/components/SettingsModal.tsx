import { useState, useEffect, useCallback } from 'react';
import { X, Settings, Palette, Type, FolderOpen, Keyboard } from 'lucide-react';
import { useI18n, type Locale } from '../i18n';
import type { TranslationKey } from '../i18n/zh-CN';
import type { ThemeName } from '../lib/theme';
import { THEMES } from '../lib/theme';
import { getImageSaveDir, setImageSaveDir } from '../lib/image-paste';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  spellCheck: boolean;
  onSpellCheckChange: (enabled: boolean) => void;
  vimMode: boolean;
  onVimModeChange: (enabled: boolean) => void;
}

type TabId = 'general' | 'editor' | 'appearance' | 'files' | 'shortcuts';

const TABS: { id: TabId; icon: React.ReactNode; labelKey: string }[] = [
  { id: 'general', icon: <Settings size={14} />, labelKey: 'settings.tabs.general' },
  { id: 'editor', icon: <Type size={14} />, labelKey: 'settings.tabs.editor' },
  { id: 'appearance', icon: <Palette size={14} />, labelKey: 'settings.tabs.appearance' },
  { id: 'files', icon: <FolderOpen size={14} />, labelKey: 'settings.tabs.files' },
  { id: 'shortcuts', icon: <Keyboard size={14} />, labelKey: 'settings.tabs.shortcuts' },
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
}: SettingsModalProps) {
  const { t, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [imageDir, setImageDir] = useState(getImageSaveDir);

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
              <span>{t(tab.labelKey as TranslationKey)}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t((TABS.find((t) => t.id === activeTab)?.labelKey ?? 'settings.title') as TranslationKey)}
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
                    {(Object.entries(THEMES) as [ThemeName, import('../lib/theme').ThemeConfig][]).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </SettingItem>
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
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-2">
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {t('settings.shortcuts.description')}
                </p>
                {SHORTCUT_LIST.map((sc) => (
                  <ShortcutRow
                    key={sc.labelKey}
                    action={t(sc.labelKey as TranslationKey)}
                    keys={sc.keys}
                  />
                ))}
              </div>
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

/** Keyboard shortcut definition */
interface ShortcutDef {
  labelKey: string;
  keys: string;
}

const SHORTCUT_LIST: ShortcutDef[] = [
  { labelKey: 'settings.shortcuts.newTab', keys: 'Ctrl+N' },
  { labelKey: 'settings.shortcuts.openFile', keys: 'Ctrl+O' },
  { labelKey: 'settings.shortcuts.saveFile', keys: 'Ctrl+S' },
  { labelKey: 'settings.shortcuts.saveAsFile', keys: 'Ctrl+Shift+S' },
  { labelKey: 'settings.shortcuts.closeTab', keys: 'Ctrl+W' },
  { labelKey: 'settings.shortcuts.findReplace', keys: 'Ctrl+F / Ctrl+H' },
  { labelKey: 'settings.shortcuts.editMode', keys: 'Ctrl+1' },
  { labelKey: 'settings.shortcuts.splitMode', keys: 'Ctrl+2' },
  { labelKey: 'settings.shortcuts.previewMode', keys: 'Ctrl+3' },
  { labelKey: 'settings.shortcuts.typewriterMode', keys: 'Ctrl+.' },
  { labelKey: 'settings.shortcuts.focusMode', keys: 'Ctrl+,' },
];

function ShortcutRow({ action, keys }: { action: string; keys: string }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded text-xs"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <span style={{ color: 'var(--text-primary)' }}>{action}</span>
      <kbd
        className="px-2 py-0.5 rounded font-mono text-[10px]"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}
      >
        {keys}
      </kbd>
    </div>
  );
}
