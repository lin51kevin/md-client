import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, CaseSensitive, Regex, Loader2, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { searchAll, replaceAll } from '../lib/search';

export interface SearchResultItem {
  file_path: string;
  file_name: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
  /** Set for in-memory untitled tabs so navigation can switch by tab ID */
  tab_id?: string;
}

type SearchOptions = { caseSensitive: boolean; wholeWord: boolean; regex: boolean };

interface SearchPanelProps {
  visible: boolean;
  content: string;
  currentFilePath: string | null;
  onContentChange: (newContent: string) => void;
  onMatchChange?: (matches: { from: number; to: number }[], activeIndex: number) => void;
  searchDir: string | null;
  onResultClick: (result: SearchResultItem) => void;
  onClose: () => void;
  /** ID of the currently active tab */
  currentTabId: string;
  /** Update any tab doc by ID */
  onAnyTabContentChange: (tabId: string, content: string) => void;
  /** All open tabs — used to include untitled in-memory files in cross-file search */
  openTabs: { id: string; filePath: string | null; doc: string; displayName?: string }[];
}

/** Byte-offset of the start of a 1-based line in text */
function lineStartOffset(text: string, lineNumber: number): number {
  let pos = 0;
  for (let i = 1; i < lineNumber; i++) {
    const nl = text.indexOf('\n', pos);
    if (nl === -1) return pos;
    pos = nl + 1;
  }
  return pos;
}

/** Convert searchAll raw results → SearchResultItem list (for current-file display) */
function toSearchResultItems(
  content: string,
  filePath: string | null,
  query: string,
  opts: SearchOptions,
): { items: SearchResultItem[]; rawMatches: { from: number; to: number }[] } {
  const raw = searchAll(content, query, opts);
  if (raw.length === 0) return { items: [], rawMatches: [] };

  const lines = content.split('\n');
  const lineStarts: number[] = [];
  let off = 0;
  for (const line of lines) { lineStarts.push(off); off += line.length + 1; }

  const fileName = filePath ? filePath.split(/[/\\]/).pop() ?? '' : '当前文件';
  const items: SearchResultItem[] = raw.map(r => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= r.from) lo = mid; else hi = mid - 1;
    }
    return {
      file_path: filePath ?? '',
      file_name: fileName,
      line_number: lo + 1,
      line_content: lines[lo],
      match_start: r.from - lineStarts[lo],
      match_end: r.to - lineStarts[lo],
    };
  });
  return { items, rawMatches: raw };
}

export function SearchPanel({
  visible, content, currentFilePath, onContentChange, onMatchChange,
  searchDir, onResultClick, onClose, openTabs, currentTabId, onAnyTabContentChange,
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [crossFile, setCrossFile] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceStatus, setReplaceStatus] = useState<string | null>(null);

  const queryInputRef = useRef<HTMLInputElement>(null);
  const onMatchChangeRef = useRef(onMatchChange);
  onMatchChangeRef.current = onMatchChange;

  const opts: SearchOptions = { caseSensitive, wholeWord, regex: useRegex };

  useEffect(() => {
    if (visible) setTimeout(() => queryInputRef.current?.focus(), 50);
  }, [visible]);

  // ── Current-file search (Enter triggered) ──────────────────────────────────
  const doCurrentFileSearch = useCallback(() => {
    if (crossFile) return;
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedIdx(null);
      setError(null);
      setReplaceStatus(null);
      onMatchChangeRef.current?.([], -1);
      return;
    }
    const { items, rawMatches } = toSearchResultItems(content, currentFilePath, query, opts);
    setSearchResults(items);
    setSelectedIdx(null);
    setError(null);
    setReplaceStatus(null);
    onMatchChangeRef.current?.(rawMatches, rawMatches.length > 0 ? 0 : -1);
  }, [crossFile, query, content, currentFilePath, caseSensitive, wholeWord, useRegex]);

  // Clear on switch to cross-file
  useEffect(() => {
    if (crossFile) {
      setSearchResults([]);
      setSelectedIdx(null);
      setError(null);
      setReplaceStatus(null);
      onMatchChangeRef.current?.([], -1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossFile]);

  // ── Cross-file search ──────────────────────────────────────────────────────
  const doSearchAll = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setReplaceStatus(null);
    setSelectedIdx(null);
    try {
      // Search in-memory untitled tabs first
      const untitledResults: SearchResultItem[] = [];
      for (const tab of openTabs.filter(t => !t.filePath)) {
        const fileName = tab.displayName ?? 'Untitled.md';
        const { items } = toSearchResultItems(tab.doc, null, query, opts);
        for (const item of items) {
          untitledResults.push({ ...item, file_name: fileName, tab_id: tab.id });
        }
      }

      // Search on-disk files (only if searchDir is known)
      let diskResults: SearchResultItem[] = [];
      if (searchDir) {
        diskResults = await invoke('search_files', {
          directory: searchDir, query: query.trim(), caseSensitive, useRegex,
        });
      }

      // No searchable scope at all (no untitled tabs AND no saved file directory)
      const noUntitled = openTabs.filter(t => !t.filePath).length === 0;
      if (noUntitled && !searchDir) {
        setError('未找到搜索目录，请先打开或保存一个文件');
        setSearchResults([]);
        return;
      }
      setSearchResults([...untitledResults, ...diskResults]);
    } catch (e: unknown) {
      setError(String(e));
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchDir, caseSensitive, wholeWord, useRegex, openTabs]);

  // ── Replace selected ───────────────────────────────────────────
  const handleReplaceSingle = useCallback(async () => {
    if (selectedIdx === null || selectedIdx >= searchResults.length) return;
    const r = searchResults[selectedIdx];

    // Untitled in-memory tab (identified by tab_id)
    if (r.tab_id) {
      const tab = openTabs.find(t => t.id === r.tab_id);
      if (tab == null) return;
      const lineStart = lineStartOffset(tab.doc, r.line_number);
      const absFrom = lineStart + r.match_start;
      const absTo = lineStart + r.match_end;
      const newContent = tab.doc.slice(0, absFrom) + replacement + tab.doc.slice(absTo);
      if (r.tab_id === currentTabId) {
        onContentChange(newContent);
      } else {
        onAnyTabContentChange(r.tab_id, newContent);
      }
      setSearchResults(prev => prev.filter((_, i) => i !== selectedIdx));
      setSelectedIdx(null);
      setReplaceStatus('已替换 1 处');
      return;
    }

    if (r.file_path === currentFilePath || (crossFile === false && r.file_path === "")) {
      // Current file in-memory replace
      const lineStart = lineStartOffset(content, r.line_number);
      const absFrom = lineStart + r.match_start;
      const absTo = lineStart + r.match_end;
      onContentChange(content.slice(0, absFrom) + replacement + content.slice(absTo));
      setSearchResults(prev => prev.filter((_, i) => i !== selectedIdx));
      setSelectedIdx(null);
    } else {
      // Cross-file disk replace
      try {
        const fileContent = await invoke<string>('read_file_text', { path: r.file_path });
        const lineStart = lineStartOffset(fileContent, r.line_number);
        const absFrom = lineStart + r.match_start;
        const absTo = lineStart + r.match_end;
        const newContent = fileContent.slice(0, absFrom) + replacement + fileContent.slice(absTo);
        await invoke('write_file_text', { path: r.file_path, content: newContent });
        setSearchResults(prev => prev.filter((_, i) => i !== selectedIdx));
        setSelectedIdx(null);
        setReplaceStatus('已替换 1 处');
      } catch (e) {
        setError(String(e));
      }
    }
  }, [selectedIdx, searchResults, crossFile, currentFilePath, content, replacement,
      onContentChange, openTabs, currentTabId, onAnyTabContentChange]);

    // ── Replace all ────────────────────────────────────────────────────────────
  const handleReplaceAll = useCallback(async () => {
    if (!query.trim()) return;
    if (!crossFile) {
      if (searchResults.length === 0) return;
      onContentChange(replaceAll(content, query, replacement, opts));
      setReplaceStatus(`已替换 ${searchResults.length} 处`);
    } else {
      setLoading(true);
      setError(null);
      setReplaceStatus(null);
      try {
        let totalReplaced = 0;

        // Replace in untitled in-memory tabs
        const tabIdCounts = new Map();
        for (const r of searchResults) {
          if (r.tab_id) tabIdCounts.set(r.tab_id, (tabIdCounts.get(r.tab_id) || 0) + 1);
        }
        for (const [tabId, count] of tabIdCounts) {
          const tab = openTabs.find(t => t.id === tabId);
          if (tab == null) continue;
          const newDoc = replaceAll(tab.doc, query, replacement, opts);
          if (tabId === currentTabId) {
            onContentChange(newDoc);
          } else {
            onAnyTabContentChange(tabId, newDoc);
          }
          totalReplaced += count;
        }

        // Replace in disk files
        let diskReplaced = 0;
        let filesModified = 0;
        if (searchDir) {
          const res = await invoke<{ replaced_count: number; files_modified: string[] }>('replace_in_files', {
            directory: searchDir, query: query.trim(), replacement, caseSensitive, useRegex,
          });
          diskReplaced = res.replaced_count;
          filesModified = res.files_modified.length;
        }
        totalReplaced += diskReplaced;
        const fileNote = filesModified > 0 ? ('，涉及 ' + filesModified + ' 个文件') : '';
        setReplaceStatus('已替换 ' + totalReplaced + ' 处' + fileNote);
        await doSearchAll();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, replacement, crossFile, searchResults, searchDir, content, caseSensitive, useRegex, opts, onContentChange, doSearchAll]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (crossFile) { doSearchAll(); } else { doCurrentFileSearch(); }
    }
  }, [onClose, crossFile, doSearchAll, doCurrentFileSearch]);

  const renderHighlight = (line: string, start: number, end: number): React.ReactNode => (
    <>{line.slice(0, start)}<mark className="search-highlight">{line.slice(start, end)}</mark>{line.slice(end)}</>
  );

  if (!visible) return null;

  const hasResults = searchResults.length > 0;
  const singleReplaceDisabled = selectedIdx === null;
  // cross-file replace all needs at least a searchDir (for disk files) or untitled tabs to replace
  const hasUntitledTabs = openTabs.some(t => !t.filePath);
  const allReplaceDisabled = !query.trim() || loading || (!crossFile ? !hasResults : (!searchDir && !hasUntitledTabs));

  const chkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
    color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
    fontSize: 11, userSelect: 'none',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 8px', fontSize: 13,
    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    borderRadius: 5, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '3px 10px', fontSize: 12, whiteSpace: 'nowrap',
    border: '1px solid var(--border-color)', borderRadius: 4,
    color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1, flexShrink: 0,
  });

  return (
    <div style={{
      position: 'fixed', top: 44, bottom: 26, right: 0, width: 420,
      backgroundColor: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', animation: 'slideInRight 0.2s ease-out',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px 8px',
        borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        <Search size={14} strokeWidth={1.8} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>搜索与替换</span>
        <button onClick={onClose} title="关闭 (Esc)"
          style={{ color: 'var(--text-secondary)', flexShrink: 0, padding: 3 }}>
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Inputs ── */}
      <div style={{
        padding: '10px 12px 8px', borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Query */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={11} style={{
              position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-secondary)', pointerEvents: 'none',
            }} />
            <input
              ref={queryInputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={'查找（回车搜索）…'}
              spellCheck={false}
              style={{ ...inputStyle, paddingLeft: 24, paddingRight: query ? 22 : 8 }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{
                position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}>
                <X size={11} />
              </button>
            )}
          </div>
          {crossFile && (
            <button onClick={doSearchAll} disabled={!query.trim() || loading}
              title="搜索 (Enter)"
              style={{ padding: 4, color: 'var(--text-secondary)', opacity: (!query.trim() || loading) ? 0.3 : 1 }}>
              {loading ? <Loader2 size={14} strokeWidth={1.8} className="spin-icon" /> : <Search size={14} strokeWidth={1.8} />}
            </button>
          )}
        </div>

        {/* Replace */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            value={replacement}
            onChange={e => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'Enter') handleReplaceSingle();
            }}
            placeholder="替换为…"
            spellCheck={false}
            style={inputStyle}
          />
          <button onClick={handleReplaceSingle} disabled={singleReplaceDisabled} title="替换选中项"
            style={btnStyle(singleReplaceDisabled)}>替换</button>
          <button onClick={handleReplaceAll} disabled={allReplaceDisabled} title="全部替换"
            style={btnStyle(allReplaceDisabled)}>全部替换</button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={chkStyle(caseSensitive)}>
            <input type="checkbox" checked={caseSensitive} onChange={() => setCaseSensitive(v => !v)}
              style={{ accentColor: 'var(--accent-color)', width: 11, height: 11 }} />
            <CaseSensitive size={12} strokeWidth={1.8} />
            <span>区分大小写</span>
          </label>
          <label style={chkStyle(wholeWord)}>
            <input type="checkbox" checked={wholeWord} onChange={() => setWholeWord(v => !v)}
              style={{ accentColor: 'var(--accent-color)', width: 11, height: 11 }} />
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>W</span>
            <span>全字匹配</span>
          </label>
          <label style={chkStyle(useRegex)}>
            <input type="checkbox" checked={useRegex} onChange={() => setUseRegex(v => !v)}
              style={{ accentColor: 'var(--accent-color)', width: 11, height: 11 }} />
            <Regex size={12} strokeWidth={1.8} />
            <span>正则</span>
          </label>
          <label style={{ ...chkStyle(crossFile), marginLeft: 'auto' }}>
            <input type="checkbox" checked={crossFile} onChange={() => setCrossFile(v => !v)}
              style={{ accentColor: 'var(--accent-color)', width: 11, height: 11 }} />
            <span style={{ color: crossFile ? 'var(--accent-color)' : 'var(--text-secondary)' }}>跨文件</span>
          </label>
        </div>
      </div>

      {/* ── Status ── */}
      {error && <div style={{ padding: '6px 12px', color: '#e53e3e', fontSize: 12, flexShrink: 0 }}>{error}</div>}
      {replaceStatus && <div style={{ padding: '6px 12px', color: 'var(--accent-color)', fontSize: 12, flexShrink: 0 }}>{replaceStatus}</div>}

      {/* ── Results ── */}
      {hasResults && (
        <div style={{
          padding: '5px 12px', fontSize: 11, flexShrink: 0,
          color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)',
        }}>
          找到 {searchResults.length} 条匹配{crossFile && searchResults.length >= 200 ? '（已限制 200 条）' : ''}
          {!crossFile && ' · 点击定位，替换框操作后再选择'}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {!query.trim() && !loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>
            <Search size={28} strokeWidth={1} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
            <p>输入关键词并回车搜索</p>
          </div>
        )}
        {query.trim() && !loading && !hasResults && !error && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>
            <p>未找到匹配结果</p>
          </div>
        )}
        {searchResults.map((r, i) => {
          const isSelected = selectedIdx === i;
          return (
            <button
              key={`${r.file_path}:${r.line_number}:${i}`}
              onClick={() => { setSelectedIdx(i); onResultClick(r); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 14px', border: 'none',
                backgroundColor: isSelected ? 'var(--accent-bg, rgba(59,130,246,0.12))' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--accent-color)' : '2px solid transparent',
                color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12,
                lineHeight: 1.5, wordBreak: 'break-all',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
                <FileText size={11} strokeWidth={1.8}
                  style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.file_name}
                </span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto', flexShrink: 0, fontSize: 11 }}>
                  :{r.line_number}
                </span>
              </div>
              <div style={{
                color: 'var(--text-secondary)', paddingLeft: 16,
                fontFamily: 'monospace', fontSize: 11.5,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {renderHighlight(r.line_content, r.match_start, r.match_end)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
