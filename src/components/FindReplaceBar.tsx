import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ArrowUp, ArrowDown, X, ReplaceAll } from 'lucide-react';
import { searchAll, replaceAll, replaceNext } from '../lib/search';

interface FindReplaceBarProps {
  /** 当前文档内容 */
  content: string;
  /** 替换后的回调（用于更新文档） */
  onContentChange: (newContent: string) => void;
  /** 关闭搜索栏 */
  onClose: () => void;
  /** 搜索结果变化时通知外部（用于编辑器高亮 + 滚动定位） */
  onMatchChange?: (matches: { from: number; to: number }[], activeIndex: number) => void;
}

export function FindReplaceBar({ content, onContentChange, onClose, onMatchChange }: FindReplaceBarProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<{ from: number; to: number; match: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // 搜索结果实时更新
  useEffect(() => {
    if (!query) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    const res = searchAll(content, query, { caseSensitive, regex: useRegex });
    setResults(res);
    const idx = res.length > 0 ? 0 : -1;
    setActiveIndex(idx);
    onMatchChange?.(res, idx);
  }, [query, content, caseSensitive, useRegex, onMatchChange]);

  // 打开时自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 跳转到下一个
  const goNext = useCallback(() => {
    if (results.length === 0) return;
    setActiveIndex(prev => {
      const next = (prev + 1) % results.length;
      onMatchChange?.(results, next);
      return next;
    });
  }, [results, onMatchChange]);

  // 跳转到上一个
  const goPrev = useCallback(() => {
    if (results.length === 0) return;
    setActiveIndex(prev => {
      const next = (prev - 1 + results.length) % results.length;
      onMatchChange?.(results, next);
      return next;
    });
  }, [results, onMatchChange]);

  // 替换当前
  const handleReplace = useCallback(() => {
    if (activeIndex < 0 || results.length === 0) return;
    const currentResult = results[activeIndex];
    const result = replaceNext(content, query, replacement, currentResult.from, { caseSensitive, regex: useRegex });
    if (result) {
      onContentChange(result.newText);
    }
  }, [content, query, replacement, activeIndex, results, caseSensitive, useRegex, onContentChange]);

  // 替换全部
  const handleReplaceAll = useCallback(() => {
    if (!query) return;
    const newContent = replaceAll(content, query, replacement, { caseSensitive, regex: useRegex });
    onContentChange(newContent);
  }, [content, query, replacement, caseSensitive, useRegex, onContentChange]);

  // ESC 关闭
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      goNext();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'Tab') {
      // Tab 切换到替换框
      e.preventDefault();
      replaceInputRef.current?.focus();
    }
  }, [onClose, goNext, goPrev]);

  const resultLabel = query
    ? results.length > 0
      ? `${activeIndex + 1} / ${results.length}`
      : '无结果'
    : '';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
      {/* 搜索输入 */}
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2" style={{ color: 'var(--text-secondary)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="查找"
          className="w-44 pl-7 pr-2 py-1 text-xs rounded focus:outline-none"
          style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          spellCheck={false}
        />
        <span className="absolute right-8 text-[10px] tabular-nums w-12 text-right" style={{ color: 'var(--text-secondary)' }}>
          {resultLabel}
        </span>
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-1.5" style={{ color: 'var(--text-secondary)' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* 上/下一个 */}
      <button onClick={goPrev} disabled={results.length === 0} title="上一个 (Shift+Enter)" className="p-1 rounded disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}>
        <ArrowUp size={14} />
      </button>
      <button onClick={goNext} disabled={results.length === 0} title="下一个 (Enter)" className="p-1 rounded disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}>
        <ArrowDown size={14} />
      </button>

      {/* 分隔线 */}
      <div className="w-px h-4" style={{ backgroundColor: 'var(--border-color)' }} />

      {/* 替换输入 */}
      <input
        ref={replaceInputRef}
        type="text"
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="替换"
        className="w-32 px-2 py-1 text-xs rounded focus:outline-none"
        style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        spellCheck={false}
      />

      {/* 替换 / 全部替换 */}
      <button onClick={handleReplace} disabled={results.length === 0} title="替换" className="px-2 py-1 text-xs rounded disabled:opacity-30" style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
        替换
      </button>
      <button onClick={handleReplaceAll} disabled={results.length === 0} title="全部替换" className="flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-30" style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
        <ReplaceAll size={12} />全部
      </button>

      {/* 选项 */}
      <label className="flex items-center gap-0.5 cursor-pointer select-none">
        <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="w-3 h-3" />
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Aa</span>
      </label>
      <label className="flex items-center gap-0.5 cursor-pointer select-none">
        <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} className="w-3 h-3" />
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>.*</span>
      </label>

      {/* 关闭 */}
      <button onClick={onClose} className="ml-auto p-1 rounded" style={{ color: 'var(--text-secondary)' }} title="关闭 (Esc)">
        <X size={14} />
      </button>
    </div>
  );
}
