/**
 * useSearchLogic — 搜索面板核心逻辑
 *
 * 从 SearchPanel 提取，封装当前文件搜索、跨文件搜索、替换等所有搜索业务逻辑。
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { searchAll, replaceAll } from '../lib/search';
import type { SearchResultItem } from '../types/search';

export type SearchOptions = { caseSensitive: boolean; wholeWord: boolean; regex: boolean };

/** Byte-offset of the start of a 1-based line in text */
export function lineStartOffset(text: string, lineNumber: number): number {
  let pos = 0;
  for (let i = 1; i < lineNumber; i++) {
    const nl = text.indexOf('\n', pos);
    if (nl === -1) return pos;
    pos = nl + 1;
  }
  return pos;
}

/** Convert searchAll raw results → SearchResultItem list (for current-file display) */
export function toSearchResultItems(
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

interface SearchStatus {
  loading: boolean;
  error: string | null;
  replaceMessage: string | null;
}

interface UseSearchLogicParams {
  content: string;
  currentFilePath: string | null;
  onContentChange: (newContent: string) => void;
  onMatchChange?: (matches: { from: number; to: number }[], activeIndex: number) => void;
  searchDir: string | null;
  currentTabId: string;
  onAnyTabContentChange: (tabId: string, content: string) => void;
  openTabs: { id: string; filePath: string | null; doc: string; displayName?: string }[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function useSearchLogic({
  content, currentFilePath, onContentChange, onMatchChange,
  searchDir, currentTabId, onAnyTabContentChange, openTabs, t,
}: UseSearchLogicParams) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [crossFile, setCrossFile] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    loading: false, error: null, replaceMessage: null,
  });

  const onMatchChangeRef = useRef(onMatchChange);
  onMatchChangeRef.current = onMatchChange;

  const opts: SearchOptions = { caseSensitive, wholeWord, regex: useRegex };

  // Current-file search
  const doCurrentFileSearch = useCallback(() => {
    if (crossFile) return;
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedIdx(null);
      setSearchStatus(s => ({ ...s, error: null, replaceMessage: null }));
      onMatchChangeRef.current?.([], -1);
      return;
    }
    const { items, rawMatches } = toSearchResultItems(content, currentFilePath, query, opts);
    setSearchResults(items);
    setSelectedIdx(null);
    setSearchStatus({ loading: false, error: null, replaceMessage: null });
    onMatchChangeRef.current?.(rawMatches, rawMatches.length > 0 ? 0 : -1);
  }, [crossFile, query, content, currentFilePath, caseSensitive, wholeWord, useRegex]);

  // Clear on switch to cross-file
  useEffect(() => {
    if (crossFile) {
      setSearchResults([]);
      setSelectedIdx(null);
      setSearchStatus({ loading: false, error: null, replaceMessage: null });
      onMatchChangeRef.current?.([], -1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossFile]);

  // Clear results immediately when query is emptied
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedIdx(null);
      setSearchStatus(s => ({ ...s, error: null, replaceMessage: null }));
      onMatchChangeRef.current?.([], -1);
    }
  }, [query]);

  // Cross-file search
  const doSearchAll = useCallback(async () => {
    if (!query.trim()) return;
    setSearchStatus({ loading: true, error: null, replaceMessage: null });
    setSelectedIdx(null);
    try {
      const untitledResults: SearchResultItem[] = [];
      for (const tab of openTabs.filter(t => !t.filePath)) {
        const fileName = tab.displayName ?? 'Untitled.md';
        const { items } = toSearchResultItems(tab.doc, null, query, opts);
        for (const item of items) {
          untitledResults.push({ ...item, file_name: fileName, tab_id: tab.id });
        }
      }

      let diskResults: SearchResultItem[] = [];
      if (searchDir) {
        diskResults = await invoke('search_files', {
          directory: searchDir, query: query.trim(), caseSensitive, useRegex, wholeWord,
        });
      }

      const noUntitled = openTabs.filter(t => !t.filePath).length === 0;
      if (noUntitled && !searchDir) {
        setSearchStatus(s => ({ ...s, error: '未找到搜索目录，请先打开或保存一个文件' }));
        setSearchResults([]);
        return;
      }
      setSearchResults([...untitledResults, ...diskResults]);
    } catch (e: unknown) {
      setSearchStatus(s => ({ ...s, error: String(e) }));
      setSearchResults([]);
    } finally {
      setSearchStatus(s => ({ ...s, loading: false }));
    }
  }, [query, searchDir, caseSensitive, wholeWord, useRegex, openTabs]);

  // Debounced cross-file search
  const crossFileSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!crossFile || !query.trim()) return;
    if (crossFileSearchTimerRef.current) clearTimeout(crossFileSearchTimerRef.current);
    crossFileSearchTimerRef.current = setTimeout(() => {
      doSearchAll();
    }, 300);
    return () => { if (crossFileSearchTimerRef.current) clearTimeout(crossFileSearchTimerRef.current); };
  }, [query, crossFile, caseSensitive, wholeWord, useRegex, doSearchAll]);

  // Replace selected
  const handleReplaceSingle = useCallback(async () => {
    if (selectedIdx === null || selectedIdx >= searchResults.length) return;
    const r = searchResults[selectedIdx];

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
      setSearchStatus(s => ({ ...s, replaceMessage: '已替换 1 处' }));
      return;
    }

    if (r.file_path === currentFilePath || (crossFile === false && r.file_path === "")) {
      const lineStart = lineStartOffset(content, r.line_number);
      const absFrom = lineStart + r.match_start;
      const absTo = lineStart + r.match_end;
      onContentChange(content.slice(0, absFrom) + replacement + content.slice(absTo));
      setSearchResults(prev => prev.filter((_, i) => i !== selectedIdx));
      setSelectedIdx(null);
    } else {
      try {
        const fileContent = await invoke<string>('read_file_text', { path: r.file_path });
        const lineStart = lineStartOffset(fileContent, r.line_number);
        const absFrom = lineStart + r.match_start;
        const absTo = lineStart + r.match_end;
        const newContent = fileContent.slice(0, absFrom) + replacement + fileContent.slice(absTo);
        await invoke('write_file_text', { path: r.file_path, content: newContent });
        setSearchResults(prev => prev.filter((_, i) => i !== selectedIdx));
        setSelectedIdx(null);
        setSearchStatus(s => ({ ...s, replaceMessage: t('search.replaced', { count: 1 }) }));
      } catch (e) {
        setSearchStatus(s => ({ ...s, error: String(e) }));
      }
    }
  }, [selectedIdx, searchResults, crossFile, currentFilePath, content, replacement,
      onContentChange, openTabs, currentTabId, onAnyTabContentChange, t]);

  // Replace all
  const handleReplaceAll = useCallback(async () => {
    if (!query.trim()) return;
    if (!crossFile) {
      if (searchResults.length === 0) return;
      onContentChange(replaceAll(content, query, replacement, opts));
      setSearchStatus(s => ({ ...s, replaceMessage: t('search.replaced', { count: searchResults.length }) }));
    } else {
      setSearchStatus({ loading: true, error: null, replaceMessage: null });
      try {
        let totalReplaced = 0;

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

        let diskReplaced = 0;
        let filesModified = 0;
        if (searchDir) {
          const res = await invoke<{ replaced_count: number; files_modified: string[] }>('replace_in_files', {
            directory: searchDir, query: query.trim(), replacement, caseSensitive, useRegex, wholeWord,
          });
          diskReplaced = res.replaced_count;
          filesModified = res.files_modified.length;
        }
        totalReplaced += diskReplaced;
        const fileNote = filesModified > 0 ? t('search.filesModified', { count: filesModified }) : '';
        setSearchStatus(s => ({ ...s, replaceMessage: t('search.replaced', { count: totalReplaced }) + fileNote }));
        await doSearchAll();
      } catch (e) {
        setSearchStatus(s => ({ ...s, error: String(e) }));
      } finally {
        setSearchStatus(s => ({ ...s, loading: false }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, replacement, crossFile, searchResults, searchDir, content, caseSensitive, useRegex, opts, onContentChange, doSearchAll, t]);

  return {
    query, setQuery,
    replacement, setReplacement,
    caseSensitive, setCaseSensitive,
    wholeWord, setWholeWord,
    useRegex, setUseRegex,
    crossFile, setCrossFile,
    searchResults, selectedIdx, setSelectedIdx,
    searchStatus,
    doCurrentFileSearch, doSearchAll,
    handleReplaceSingle, handleReplaceAll,
  };
}
