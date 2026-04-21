import { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n';
import type { TypewriterOptions } from '../../../hooks/useTypewriterOptions';
import { SettingItem, ToggleSwitch } from './shared';

interface EditorTabProps {
  autoSave: boolean;
  onAutoSaveChange: (enabled: boolean) => void;
  autoSaveDelay: number;
  onAutoSaveDelayChange: (delay: number) => void;
  fileWatch: boolean;
  onFileWatchChange: (enabled: boolean) => void;
  fileWatchBehavior: boolean;
  onFileWatchBehaviorChange: (autoReload: boolean) => void;
  typewriterOptions?: TypewriterOptions;
  onTypewriterOptionsChange?: (update: Partial<TypewriterOptions>) => void;
}

const PRESET_DELAYS = [1000, 2000, 5000];

export function EditorTab({
  autoSave,
  onAutoSaveChange,
  autoSaveDelay,
  onAutoSaveDelayChange,
  fileWatch,
  onFileWatchChange,
  fileWatchBehavior,
  onFileWatchBehaviorChange,
  typewriterOptions,
  onTypewriterOptionsChange,
}: EditorTabProps) {
  const { t } = useI18n();
  const [isCustomDelay, setIsCustomDelay] = useState(!PRESET_DELAYS.includes(autoSaveDelay));
  const [customDelayMs, setCustomDelayMs] = useState<string>(String(autoSaveDelay));

  useEffect(() => {
    if (!PRESET_DELAYS.includes(autoSaveDelay)) {
      setIsCustomDelay(true);
      setCustomDelayMs(String(autoSaveDelay));
    } else {
      setIsCustomDelay(false);
    }
  }, [autoSaveDelay]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
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

      {typewriterOptions && onTypewriterOptionsChange && (
        <>
          <div className="text-xs font-medium mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('settings.editor.typewriterOptions')}
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('settings.editor.typewriterOptionsDesc')}
          </div>
          <SettingItem
            label={t('settings.editor.typewriterDimOthers')}
            description={t('settings.editor.typewriterDimOthersDesc')}
          >
            <ToggleSwitch
              checked={typewriterOptions.dimOthers}
              onChange={(v) => onTypewriterOptionsChange({ dimOthers: v })}
            />
          </SettingItem>
          <SettingItem
            label={t('settings.editor.typewriterHideUI')}
            description={t('settings.editor.typewriterHideUIDesc')}
          >
            <ToggleSwitch
              checked={typewriterOptions.hideUI}
              onChange={(v) => onTypewriterOptionsChange({ hideUI: v })}
            />
          </SettingItem>
          <SettingItem
            label={t('settings.editor.typewriterShowDuration')}
            description={t('settings.editor.typewriterShowDurationDesc')}
          >
            <ToggleSwitch
              checked={typewriterOptions.showDuration}
              onChange={(v) => onTypewriterOptionsChange({ showDuration: v })}
            />
          </SettingItem>
        </>
      )}
    </div>
  );
}
