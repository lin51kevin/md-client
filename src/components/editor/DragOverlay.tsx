import { useI18n } from '../../i18n';
import type { DragKind } from '../../hooks/useDragDrop';

interface DragOverlayProps {
  dragKind?: DragKind;
}

export function DragOverlay({ dragKind = 'file' }: DragOverlayProps) {
  const { t } = useI18n();
  const isFolder = dragKind === 'folder';
  return (
    <div className="fixed inset-0 z-50 border-4 border-dashed flex items-center justify-center pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)', borderColor: 'var(--accent-color)' }}>
      <div className="rounded-xl px-12 py-8 shadow-2xl text-center" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)' }}>
        <div className="text-5xl mb-3">📂</div>
        <p className="text-xl font-semibold" style={{ color: 'var(--accent-color)' }}>
          {isFolder ? t('drag.dropToOpenFolder') : t('drag.dropToOpen')}
        </p>
        {!isFolder && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('drag.supportedFormats')}</p>
        )}
      </div>
    </div>
  );
}
