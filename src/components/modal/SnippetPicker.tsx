import { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import './snippet.css';
import { useI18n } from '../../i18n';
import type { Snippet } from '../../lib/storage';
import { getSnippets, resolveSnippet } from '../../lib/storage';

interface SnippetPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (snippetId: string, resolved: { text: string; cursorPosition: number | null }) => void;
}

export function SnippetPicker({ visible, onClose, onSelect }: SnippetPickerProps) {
  const { t } = useI18n();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setSnippets(getSnippets());
      setQuery('');
      // Auto-focus search input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  const filtered = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description?.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = useCallback(
    (snippet: Snippet) => {
      onSelect(snippet.id, resolveSnippet(snippet.content, {}));
      onClose();
    },
    [onSelect, onClose],
  );

  // Keyboard navigation
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIdx]) {
        e.preventDefault();
        handleSelect(filtered[activeIdx]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, activeIdx, handleSelect, onClose],
  );

  if (!visible) return null;

  return (
    <div className="snippet-picker-overlay" onClick={onClose}>
      <div className="snippet-picker" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="snippet-picker-header">
          <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="snippet-picker-input"
            placeholder={t('snippet.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="snippet-picker-list">
          {filtered.length === 0 && (
            <div className="snippet-empty" style={{ color: 'var(--text-secondary)' }}>
              {t('snippet.noResults')}
            </div>
          )}
          {filtered.map((s, idx) => (
            <div
              key={s.id}
              className={`snippet-item ${idx === activeIdx ? 'snippet-item-active' : ''}`}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <div className="snippet-name">{s.name}</div>
              {s.description && <div className="snippet-desc">{s.description}</div>}
              <div className="snippet-preview">{escapeHtml(s.content.slice(0, 120))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '↵');
}
