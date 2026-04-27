import { useI18n, type Locale } from '../../../i18n';
import { SettingItem, ToggleSwitch } from './shared';

interface GeneralTabProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  autoUpdateCheck: boolean;
  onAutoUpdateCheckChange: (enabled: boolean) => void;
  updateCheckFrequency: 'startup' | '24h';
  onUpdateCheckFrequencyChange: (freq: 'startup' | '24h') => void;
  contextMenuIntegration: boolean;
  onContextMenuIntegrationChange: (enabled: boolean) => void;
  isWindows: boolean;
}

export function GeneralTab({
  locale,
  setLocale,
  autoUpdateCheck,
  onAutoUpdateCheckChange,
  updateCheckFrequency,
  onUpdateCheckFrequencyChange,
  contextMenuIntegration,
  onContextMenuIntegrationChange,
  isWindows,
}: GeneralTabProps) {
  const { t } = useI18n();

  return (
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
          <option value="ja-JP">日本語</option>
        </select>
      </SettingItem>

      <SettingItem
        label={t('update.autoCheck')}
        description={t('update.autoCheckDesc')}
      >
        <ToggleSwitch checked={autoUpdateCheck} onChange={onAutoUpdateCheckChange} />
      </SettingItem>

      {autoUpdateCheck && (
        <SettingItem
          label={t('update.checkFrequency')}
          description={t('update.checkFrequencyDesc')}
        >
          <select
            value={updateCheckFrequency}
            onChange={(e) => onUpdateCheckFrequencyChange(e.target.value as 'startup' | '24h')}
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

      {isWindows && (
        <SettingItem
          label={t('settings.general.contextMenu')}
          description={t('settings.general.contextMenuDesc')}
        >
          <ToggleSwitch
            checked={contextMenuIntegration}
            onChange={async (checked) => {
              onContextMenuIntegrationChange(checked);
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke(checked ? 'register_context_menu' : 'unregister_context_menu');
              } catch (e) {
                console.error('[Settings] context menu toggle failed:', e);
              }
            }}
          />
        </SettingItem>
      )}
    </div>
  );
}
