import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface FileHoverPreviewProps {
  filePath: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function FileHoverPreview({ filePath, position, onClose }: FileHoverPreviewProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<string>('read_file_text', { path: filePath })
      .then(text => setLines(text.split('\n').slice(0, 10)))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [filePath]);

  // Adjust position to stay within viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = `${position.x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${position.y - rect.height}px`;
    }
  }, [lines, position]);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-lg shadow-xl p-3 max-w-md max-h-60 overflow-hidden"
      style={{
        left: position.x + 10,
        top: position.y,
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
      }}
      onMouseEnter={onClose}
    >
      <div className="text-xs mb-1 truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
        {filePath.split(/[\\/]/).pop()}
      </div>
      {loading ? (
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>...</div>
      ) : (
        <pre className="text-xs overflow-hidden whitespace-pre" style={{ color: 'var(--text-primary)' }}>
          {lines.length > 0 ? lines.join('\n') : '(empty file)'}
        </pre>
      )}
    </div>
  );
}

export function useFileHoverPreview() {
  const [preview, setPreview] = useState<{ filePath: string; position: { x: number; y: number } } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleMouseEnter = (e: React.MouseEvent, filePath: string) => {
    timerRef.current = setTimeout(() => {
      setPreview({ filePath, position: { x: e.clientX, y: e.clientY } });
    }, 500);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    setPreview(null);
  };

  return { preview, handleMouseEnter, handleMouseLeave };
}
