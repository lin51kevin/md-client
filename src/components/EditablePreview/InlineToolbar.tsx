import React, { useEffect, useRef, useCallback } from 'react';

export interface InlineToolbarProps {
  visible: boolean;
  position: { top: number; left: number } | null;
  onFormat: (type: 'bold' | 'italic' | 'strikethrough' | 'code' | 'link') => void;
}

const FORMAT_BUTTONS: { type: InlineToolbarProps['onFormat'] extends (t: infer T) => void ? T : never; label: string }[] = [
  { type: 'bold', label: '**B**' },
  { type: 'italic', label: '*I*' },
  { type: 'strikethrough', label: '~~S~~' },
  { type: 'code', label: '</>' },
  { type: 'link', label: '🔗' },
];

export const InlineToolbar: React.FC<InlineToolbarProps> = ({ visible, position, onFormat }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
      // We don't hide here — parent controls visibility
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  if (!visible || !position) return null;

  return (
    <div
      ref={toolbarRef}
      data-testid="inline-toolbar"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        display: 'flex',
        gap: 4,
        padding: '4px 8px',
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      {FORMAT_BUTTONS.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onFormat(type)}
          data-testid={`format-btn-${type}`}
          style={{
            padding: '2px 8px',
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            fontSize: 14,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
