import { useState, useCallback } from 'react';
import { useI18n } from '../../../i18n';
import { getImageSaveDir, setImageSaveDir } from '../../../lib/utils';
import { SettingItem, ToggleSwitch } from './shared';

interface FilesTabProps {
  gitMdOnly: boolean;
  onGitMdOnlyChange: (enabled: boolean) => void;
}

export function FilesTab({ gitMdOnly, onGitMdOnlyChange }: FilesTabProps) {
  const { t } = useI18n();
  const [imageDir, setImageDir] = useState(getImageSaveDir);

  const handleImageDirChange = useCallback((dir: string) => {
    setImageDir(dir);
    setImageSaveDir(dir);
  }, []);

  return (
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
  );
}
