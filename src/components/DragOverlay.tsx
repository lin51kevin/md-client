import { useI18n } from '../i18n';

export function DragOverlay() {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 border-4 border-dashed flex items-center justify-center pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)', borderColor: 'var(--accent-color)' }}>
      <div className="rounded-xl px-12 py-8 shadow-2xl text-center" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)' }}>
        <div className="text-5xl mb-3">📂</div>
        <p className="text-xl font-semibold" style={{ color: 'var(--accent-color)' }}>{t('drag.dropToOpen')}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>支持 .md · .markdown · .txt</p>
      </div>
    </div>
  );
}
