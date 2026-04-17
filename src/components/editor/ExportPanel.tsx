import { useState } from 'react';
import { useI18n } from '../i18n';

interface ExportPanelProps {
  content: string;
  fileName: string;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onExportHtml: () => void;
  onExportPng: () => void;
  onExportEpub: () => void;
  onClose: () => void;
}

const FORMATS = ['pdf', 'docx', 'html', 'png', 'epub'] as const;
type Format = typeof FORMATS[number];

const FORMAT_LABELS: Record<Format, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  html: 'HTML',
  png: 'PNG',
  epub: 'EPUB',
};

export function ExportPanel({ onExportPdf, onExportDocx, onExportHtml, onExportPng, onExportEpub, onClose }: ExportPanelProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<Format>('pdf');

  const handleExport = async () => {
    switch (format) {
      case 'pdf': await onExportPdf(); break;
      case 'docx': await onExportDocx(); break;
      case 'html': await onExportHtml(); break;
      case 'png': await onExportPng(); break;
      case 'epub': await onExportEpub(); break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative rounded-lg shadow-xl p-4 min-w-80"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
      >
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          {t('export.title')}
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {FORMATS.map(f => (
            <button
              key={f}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: format === f ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: format === f ? 'var(--bg-primary)' : 'var(--text-primary)',
              }}
              onClick={() => setFormat(f)}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 rounded text-xs"
            style={{ color: 'var(--text-secondary)' }}
            onClick={onClose}
          >
            {t('export.cancel')}
          </button>
          <button
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
            onClick={handleExport}
          >
            {t('export.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
