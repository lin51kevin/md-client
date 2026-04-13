import { useState, useCallback } from 'react';
import { getCustomCss, setCustomCss, clearCustomCss, applyCustomCss, removeCustomCssStyle } from '../lib/custom-css';

export function CustomCssEditor() {
  const [css, setCss] = useState(() => getCustomCss());

  const handleApply = useCallback(() => {
    setCustomCss(css);
    applyCustomCss(css);
  }, [css]);

  const handleClear = useCallback(() => {
    setCss('');
    clearCustomCss();
    removeCustomCssStyle();
  }, []);

  return (
    <div className="space-y-2">
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        作用于 <code>.markdown-preview</code>、<code>.editor-container</code> 等自定义 CSS 区域
      </div>

      <textarea
        value={css}
        onChange={(e) => setCss(e.target.value)}
        placeholder={`.markdown-preview {\n  font-family: Georgia, serif;\n  font-size: 16px;\n}`}
        rows={8}
        spellCheck={false}
        className="w-full text-xs rounded p-2 outline-none resize-y font-mono leading-relaxed"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          minHeight: 120,
        }}
      />

      <div className="flex gap-2 justify-end">
        <button
          onClick={handleClear}
          className="text-xs px-3 py-1 rounded transition-colors"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }}
        >
          清除
        </button>
        <button
          onClick={handleApply}
          className="text-xs px-3 py-1 rounded transition-colors"
          style={{
            backgroundColor: 'var(--accent-bg)',
            border: '1px solid var(--accent-color)',
            color: 'var(--accent-color)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-bg)';
            e.currentTarget.style.color = 'var(--accent-color)';
          }}
        >
          应用
        </button>
      </div>
    </div>
  );
}
