import { useI18n } from '../../../i18n';
import { SettingItem, ToggleSwitch } from './shared';

interface PreviewTabProps {
  milkdownPreview: boolean;
  onMilkdownPreviewChange: (enabled: boolean) => void;
  mermaidTheme: string;
  onMermaidThemeChange: (theme: string) => void;
}

export function PreviewTab({
  milkdownPreview,
  onMilkdownPreviewChange,
  mermaidTheme,
  onMermaidThemeChange,
}: PreviewTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <SettingItem
        label={t('settings.preview.milkdownPreview')}
        description={t('settings.preview.milkdownPreviewDesc')}
      >
        <ToggleSwitch checked={milkdownPreview} onChange={onMilkdownPreviewChange} />
      </SettingItem>

      <SettingItem
        label={t('settings.preview.mermaidTheme')}
        description={t('settings.preview.mermaidThemeDesc')}
      >
        <select
          value={mermaidTheme}
          onChange={(e) => onMermaidThemeChange(e.target.value)}
          className="text-xs px-2 py-1 rounded outline-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="default">{t('settings.preview.mermaidDefault')}</option>
          <option value="forest">{t('settings.preview.mermaidForest')}</option>
          <option value="dark">{t('settings.preview.mermaidDark')}</option>
          <option value="neutral">{t('settings.preview.mermaidNeutral')}</option>
        </select>
      </SettingItem>
    </div>
  );
}
