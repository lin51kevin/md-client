import { useMemo } from 'react';

interface DiffViewerProps {
  diff: string;
  filePath?: string;
}

export function DiffViewer({ diff, filePath }: DiffViewerProps) {
  const lines = useMemo(() => diff.split('\n'), [diff]);

  if (!diff.trim()) {
    return (
      <div
        className="flex items-center justify-center h-24 text-xs rounded"
        style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
      >
        无差异 — no diff
      </div>
    );
  }

  return (
    <div className="text-xs font-mono overflow-auto rounded" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
      {filePath && (
        <div
          className="px-3 py-1.5 text-[10px] border-b truncate"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          {filePath}
        </div>
      )}
      <pre className="p-2 overflow-auto leading-5 m-0">
        {lines.map((line, idx) => {
          let bg = 'transparent';
          let color = 'var(--text-primary)';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            bg = 'rgba(0, 150, 80, 0.15)';
            color = '#22863a';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bg = 'rgba(220, 50, 50, 0.12)';
            color = '#cb2431';
          } else if (line.startsWith('@@')) {
            bg = 'rgba(0, 100, 200, 0.08)';
            color = 'var(--text-secondary)';
          }

          return (
            <div key={idx} style={{ backgroundColor: bg, color }}>
              {line || ' '}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
