import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, CaseSensitive, Regex, Loader2, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export interface SearchResultItem {
  file_path: string;
  file_name: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

interface CrossFileSearchProps {
  visible: boolean;
  searchDir: string | null;
  onClose: () => void;
  onResultClick: (result: SearchResultItem) => void;
}

export function CrossFileSearch({ visible, searchDir, onClose, onResultClick }: CrossFileSearchProps) {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => { inputRef.current?.focus(); }, 100);
    }
  }, [visible]);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !searchDir) return;
    setLoading(true);
    setError(null);
    try {
      const res: SearchResultItem[] = await invoke('search_files', {
        directory: searchDir,
        query: query.trim(),
        caseSensitive,
        useRegex,
      });
      setResults(res);
    } catch (e: unknown) {
      setError(String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, searchDir, caseSensitive, useRegex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') onClose();
  }, [doSearch, onClose]);

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'var(--accent-color)';
  }

  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'var(--border-color)';
  }

  function renderHighlightedLine(line: string, start: number, end: number): React.ReactNode {
    const before = line.slice(0, start);
    const match = line.slice(start, end);
    const after = line.slice(end);
    return (
      <>
        {before}
        <mark className="search-highlight">{match}</mark>
        {after}
      </>
    );
  }

  if (!visible) return null;

  return (
    <div className="cross-file-search-panel" style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 420,
      height: '100vh',
      backgroundColor: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-color)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      animation: 'slideInRight 0.2s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        flexShrink: 0,
      }}>
        <Search size={15} strokeWidth={1.8} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索关键词…"
          spellCheck={false}
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            padding: '5px 9px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            minWidth: 0,
          }}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        <button
          onClick={doSearch}
          disabled={!query.trim() || loading || !searchDir}
          title="搜索"
          style={{ flexShrink: 0 }}
        >
          {loading ? (
            <Loader2 size={14} strokeWidth={1.8} className="spin-icon" />
          ) : (
            <Search size={14} strokeWidth={1.8} />
          )}
        </button>
        <button onClick={onClose} title="关闭" style={{ flexShrink: 0 }}>
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* Options bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 14px',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        fontSize: 12,
      }}>
        <label
          title="大小写敏感"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            color: caseSensitive ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={() => setCaseSensitive((v) => !v)}
            style={{ accentColor: 'var(--accent-color)' }}
          />
          <CaseSensitive size={12} strokeWidth={1.8} />
        </label>
        <span style={{ width: 1, height: 12, backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
        <label
          title="正则表达式"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            color: useRegex ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={useRegex}
            onChange={() => setUseRegex((v) => !v)}
            style={{ accentColor: 'var(--accent-color)' }}
          />
          <Regex size={12} strokeWidth={1.8} />
          <span>正则</span>
        </label>
        {searchDir && (
          <span
            style={{
              marginLeft: 'auto',
              color: 'var(--text-secondary)',
              fontSize: 11,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
          >
            搜索: {searchDir.split(/[/\\]/).pop() ?? ''}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{ padding: '8px 14px', color: '#e53e3e', fontSize: 12, flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Results count */}
      {!error && results.length > 0 && (
        <div
          style={{
            padding: '6px 14px',
            fontSize: 11,
            flexShrink: 0,
            color: 'var(--text-secondary)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          找到 {results.length} 条匹配{results.length >= 200 ? '（已限制显示前200条）' : ''}
        </div>
      )}

      {/* Results list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 0',
        }}
      >
        {!query.trim() && !loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>
            <Search size={28} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>输入关键词并回车搜索</p>
          </div>
        )}
        {query.trim() && !loading && results.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>
            <p>未找到匹配结果</p>
          </div>
        )}
        {results.map((r, i) => (
          <button
            key={`${r.file_path}:${i}`}
            onClick={() => onResultClick(r)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '7px 14px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1.5,
              transition: 'background-color 0.1s',
              wordBreak: 'break-all',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, var(--bg-secondary))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
              <FileText size={11} strokeWidth={1.8} style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.file_name}
              </span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto', flexShrink: 0, fontSize: 11 }}>
                :{r.line_number}
              </span>
            </div>
            <div
              style={{
                color: 'var(--text-secondary)',
                paddingLeft: 16,
                fontFamily: 'monospace',
                fontSize: 11.5,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {renderHighlightedLine(r.line_content, r.match_start, r.match_end)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
