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
}

export function FindReplaceBar({ content, onContentChange, onClose }: FindReplaceBarProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<{ from: number; to: number; match: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // 搜索结果实时更新
  useEffect(() => {
    if (!query) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    const res = searchAll(content, query, { caseSensitive, regex: useRegex });
    setResults(res);
    setActiveIndex(res.length > 0 ? 0 : -1);
  }, [query, content, caseSensitive, useRegex]);

  // 打开时自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 跳转到下一个
  const goNext = useCallback(() => {
    if (results.length === 0) return;
    setActiveIndex(prev => (prev + 1) % results.length);
  }, [results.length]);

  // 跳转到上一个
  const goPrev = useCallback(() => {
    if (results.length === 0) return;
    setActiveIndex(prev => (prev - 1 + results.length) % results.length);
  }, [results.length]);

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
      document.getElementById('replace-input')?.focus();
    }
  }, [onClose, goNext, goPrev]);

  const resultLabel = query
    ? results.length > 0
      ? `${activeIndex + 1} / ${results.length}`
      : '无结果'
    : '';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border-b border-slate-300 text-xs">
      {/* 搜索输入 */}
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="查找"
          className="w-44 pl-7 pr-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-400"
          spellCheck={false}
        />
        <span className="absolute right-8 text-[10px] text-slate-400 tabular-nums w-12 text-right">
          {resultLabel}
        </span>
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-1.5 text-slate-400 hover:text-slate-600">
            <X size={12} />
          </button>
        )}
      </div>

      {/* 上/下一个 */}
      <button onClick={goPrev} disabled={results.length === 0} title="上一个 (Shift+Enter)" className="p-1 rounded hover:bg-slate-200 disabled:opacity-30">
        <ArrowUp size={14} />
      </button>
      <button onClick={goNext} disabled={results.length === 0} title="下一个 (Enter)" className="p-1 rounded hover:bg-slate-200 disabled:opacity-30">
        <ArrowDown size={14} />
      </button>

      {/* 分隔线 */}
      <div className="w-px h-4 bg-slate-300" />

      {/* 替换输入 */}
      <input
        id="replace-input"
        type="text"
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="替换"
        className="w-32 px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-400"
        spellCheck={false}
      />

      {/* 替换 / 全部替换 */}
      <button onClick={handleReplace} disabled={results.length === 0} title="替换" className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-200 disabled:opacity-30">
        替换
      </button>
      <button onClick={handleReplaceAll} disabled={results.length === 0} title="全部替换" className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-200 disabled:opacity-30">
        <ReplaceAll size={12} />全部
      </button>

      {/* 选项 */}
      <label className="flex items-center gap-0.5 cursor-pointer select-none">
        <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="w-3 h-3" />
        <span className="text-[11px] text-slate-500">Aa</span>
      </label>
      <label className="flex items-center gap-0.5 cursor-pointer select-none">
        <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} className="w-3 h-3" />
        <span className="text-[11px] text-slate-500">.*</span>
      </label>

      {/* 关闭 */}
      <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-200" title="关闭 (Esc)">
        <X size={14} />
      </button>
    </div>
  );
}
